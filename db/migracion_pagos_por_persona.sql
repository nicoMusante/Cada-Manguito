--corre este archivo una sola vez sobre la base Neon antes de publicar el cambio.

ALTER TABLE deudas ADD COLUMN IF NOT EXISTS movimiento_inicial_id INTEGER REFERENCES movimientos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_deudas_movimiento_inicial ON deudas (movimiento_inicial_id);
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'ARS';
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS monto_original NUMERIC(14,2);
ALTER TABLE deudas DROP CONSTRAINT IF EXISTS chk_deuda_moneda;
ALTER TABLE deudas ADD CONSTRAINT chk_deuda_moneda CHECK (moneda IN ('ARS', 'USD'));

CREATE OR REPLACE FUNCTION crear_deuda(
    p_usuario_id INTEGER, p_persona_nombre VARCHAR, p_tipo VARCHAR,
    p_monto NUMERIC, p_descripcion VARCHAR, p_fecha DATE DEFAULT NULL,
    p_movimiento_id INTEGER DEFAULT NULL, p_registrar_movimiento BOOLEAN DEFAULT false
) RETURNS INTEGER AS $$
DECLARE
    v_persona_id INTEGER;
    v_id INTEGER;
    v_fecha DATE;
    v_categoria_id INTEGER;
    v_movimiento_inicial_id INTEGER;
BEGIN
    v_persona_id := obtener_o_crear_persona(p_usuario_id, p_persona_nombre);
    v_fecha := COALESCE(p_fecha, hoy_ar());
    INSERT INTO deudas (usuario_id, persona_id, tipo, monto, descripcion, fecha, movimiento_id, estado)
    VALUES (p_usuario_id, v_persona_id, p_tipo, p_monto, p_descripcion, v_fecha, p_movimiento_id, 'pendiente')
    RETURNING id INTO v_id;

    IF p_registrar_movimiento AND p_movimiento_id IS NULL THEN
        v_categoria_id := obtener_o_crear_categoria_pago_deuda(
            p_usuario_id, CASE WHEN p_tipo = 'ME_DEBEN' THEN 'GASTO' ELSE 'INGRESO' END
        );
        INSERT INTO movimientos (usuario_id, categoria_id, descripcion, monto, tipo, fecha)
        VALUES (
            p_usuario_id, v_categoria_id,
            LEFT(TRIM(p_descripcion) || ' (' || CASE WHEN p_tipo = 'ME_DEBEN' THEN 'a ' ELSE 'de ' END || TRIM(p_persona_nombre) || ')', 120),
            p_monto, CASE WHEN p_tipo = 'ME_DEBEN' THEN 'GASTO' ELSE 'INGRESO' END, v_fecha
        ) RETURNING id INTO v_movimiento_inicial_id;
        UPDATE deudas SET movimiento_inicial_id = v_movimiento_inicial_id WHERE id = v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crear_deuda(
    p_usuario_id INTEGER, p_persona_nombre VARCHAR, p_tipo VARCHAR,
    p_monto NUMERIC, p_descripcion VARCHAR, p_fecha DATE,
    p_movimiento_id INTEGER, p_registrar_movimiento BOOLEAN,
    p_moneda VARCHAR, p_monto_original NUMERIC
) RETURNS INTEGER AS $$
DECLARE v_id INTEGER;
BEGIN
    IF p_moneda NOT IN ('ARS', 'USD') OR (p_moneda = 'USD' AND (p_monto_original IS NULL OR p_monto_original <= 0)) THEN
        RAISE EXCEPTION 'La moneda o el monto en dólares no son válidos.';
    END IF;
    v_id := crear_deuda(p_usuario_id, p_persona_nombre, p_tipo, p_monto, p_descripcion, p_fecha, p_movimiento_id, p_registrar_movimiento);
    UPDATE deudas SET moneda = p_moneda, monto_original = CASE WHEN p_moneda = 'USD' THEN p_monto_original ELSE NULL END WHERE id = v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crear_movimiento_compartido(
    p_usuario_id INTEGER, p_categoria_id INTEGER, p_descripcion VARCHAR,
    p_monto NUMERIC, p_tipo VARCHAR, p_fecha DATE, p_moneda VARCHAR,
    p_monto_original NUMERIC, p_personas JSONB
) RETURNS INTEGER AS $$
DECLARE v_movimiento_id INTEGER;
BEGIN
    v_movimiento_id := insertar_movimiento(
        p_usuario_id, p_categoria_id, p_descripcion, p_monto, p_tipo,
        p_fecha, p_moneda, p_monto_original
    );
    PERFORM crear_deudas_compartidas(
        p_usuario_id, v_movimiento_id, p_descripcion, p_fecha, p_personas
    );
    RETURN v_movimiento_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pagar_persona(
    p_usuario_id INTEGER,
    p_persona_id INTEGER,
    p_tipo VARCHAR,
    p_monto NUMERIC
) RETURNS VOID AS $$
DECLARE
    v_deuda RECORD;
    v_restante NUMERIC := p_monto;
    v_saldo NUMERIC;
    v_aplicar NUMERIC;
    v_total_movimiento NUMERIC := 0;
    v_nombre VARCHAR(60);
BEGIN
    IF p_tipo NOT IN ('ME_DEBEN', 'YO_DEBO') OR p_monto <= 0 THEN
        RAISE EXCEPTION 'El pago indicado no es válido.';
    END IF;

    SELECT nombre INTO v_nombre
    FROM personas WHERE id = p_persona_id AND usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La persona indicada no existe.';
    END IF;

    IF p_monto > COALESCE((
        SELECT SUM(d.monto - COALESCE(pg.pagado, 0))
        FROM deudas d
        LEFT JOIN LATERAL (SELECT SUM(monto) AS pagado FROM pagos_deuda WHERE deuda_id = d.id) pg ON true
        WHERE d.usuario_id = p_usuario_id AND d.persona_id = p_persona_id
          AND d.tipo = p_tipo AND d.estado = 'pendiente'
    ), 0) THEN
        RAISE EXCEPTION 'El monto supera el saldo pendiente.';
    END IF;

    FOR v_deuda IN
        SELECT d.id, d.monto, d.movimiento_id, COALESCE(pg.pagado, 0) AS pagado
        FROM deudas d
        LEFT JOIN LATERAL (SELECT SUM(monto) AS pagado FROM pagos_deuda WHERE deuda_id = d.id) pg ON true
        WHERE d.usuario_id = p_usuario_id AND d.persona_id = p_persona_id
          AND d.tipo = p_tipo AND d.estado = 'pendiente'
        ORDER BY d.fecha, d.id
    LOOP
        EXIT WHEN v_restante = 0;
        v_saldo := v_deuda.monto - v_deuda.pagado;
        v_aplicar := LEAST(v_restante, v_saldo);

        INSERT INTO pagos_deuda (deuda_id, monto) VALUES (v_deuda.id, v_aplicar);
        UPDATE deudas
        SET estado = CASE WHEN v_aplicar = v_saldo THEN 'saldado' ELSE estado END,
            saldado_en = CASE WHEN v_aplicar = v_saldo THEN CURRENT_TIMESTAMP ELSE saldado_en END
        WHERE id = v_deuda.id;

        v_total_movimiento := v_total_movimiento + v_aplicar;
        v_restante := v_restante - v_aplicar;
    END LOOP;

    IF v_total_movimiento > 0 THEN
        PERFORM registrar_movimiento_pago_deuda(
            p_usuario_id, p_tipo, v_total_movimiento,
            'Varias deudas', false, v_nombre
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION saldar_persona(p_usuario_id INTEGER, p_persona_id INTEGER) RETURNS VOID AS $$
DECLARE
    v_tipo VARCHAR(10);
    v_total NUMERIC;
BEGIN
    FOR v_tipo IN SELECT unnest(ARRAY['ME_DEBEN'::VARCHAR, 'YO_DEBO'::VARCHAR])
    LOOP
        SELECT COALESCE(SUM(d.monto - COALESCE(pg.pagado, 0)), 0) INTO v_total
        FROM deudas d
        LEFT JOIN LATERAL (SELECT SUM(monto) AS pagado FROM pagos_deuda WHERE deuda_id = d.id) pg ON true
        WHERE d.usuario_id = p_usuario_id AND d.persona_id = p_persona_id
          AND d.tipo = v_tipo AND d.estado = 'pendiente';
        IF v_total > 0 THEN
            PERFORM pagar_persona(p_usuario_id, p_persona_id, v_tipo, v_total);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION saldar_deudas(p_usuario_id INTEGER, p_ids INTEGER[]) RETURNS VOID AS $$
DECLARE
    v_persona_id INTEGER;
    v_deuda RECORD;
    v_nombre VARCHAR(60);
    v_cobros NUMERIC := 0;
    v_pagos NUMERIC := 0;
BEGIN
    SELECT persona_id INTO v_persona_id
    FROM deudas WHERE id = ANY(p_ids) AND usuario_id = p_usuario_id AND estado = 'pendiente'
    LIMIT 1;
    IF v_persona_id IS NULL THEN RETURN; END IF;

    SELECT nombre INTO v_nombre FROM personas WHERE id = v_persona_id;
    FOR v_deuda IN
        SELECT d.id, d.tipo, d.movimiento_id, d.monto - COALESCE(pg.pagado, 0) AS saldo
        FROM deudas d
        LEFT JOIN LATERAL (SELECT SUM(monto) AS pagado FROM pagos_deuda WHERE deuda_id = d.id) pg ON true
        WHERE d.id = ANY(p_ids) AND d.usuario_id = p_usuario_id
          AND d.persona_id = v_persona_id AND d.estado = 'pendiente'
    LOOP
        IF v_deuda.tipo = 'ME_DEBEN' THEN
            v_cobros := v_cobros + v_deuda.saldo;
        ELSE
            v_pagos := v_pagos + v_deuda.saldo;
        END IF;
        UPDATE deudas SET estado = 'saldado', saldado_en = CURRENT_TIMESTAMP WHERE id = v_deuda.id;
    END LOOP;

    IF v_cobros > 0 THEN PERFORM registrar_movimiento_pago_deuda(p_usuario_id, 'ME_DEBEN', v_cobros, 'Varias deudas', false, v_nombre); END IF;
    IF v_pagos > 0 THEN PERFORM registrar_movimiento_pago_deuda(p_usuario_id, 'YO_DEBO', v_pagos, 'Varias deudas', false, v_nombre); END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION eliminar_deuda(p_usuario_id INTEGER, p_id INTEGER) RETURNS VOID AS $$
DECLARE
    v_movimiento_inicial_id INTEGER;
BEGIN
    SELECT d.movimiento_inicial_id
    INTO v_movimiento_inicial_id
    FROM deudas d
    WHERE d.id = p_id AND d.usuario_id = p_usuario_id
    ;
    IF NOT FOUND THEN RAISE EXCEPTION 'La deuda indicada no existe.'; END IF;

    DELETE FROM deudas WHERE id = p_id AND usuario_id = p_usuario_id;
    IF v_movimiento_inicial_id IS NOT NULL THEN
        DELETE FROM movimientos WHERE id = v_movimiento_inicial_id AND usuario_id = p_usuario_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pagar_movimiento(p_usuario_id INTEGER, p_deuda_id INTEGER, p_monto NUMERIC) RETURNS VOID AS $$
DECLARE
    v_monto_total NUMERIC;
    v_estado VARCHAR(10);
    v_tipo VARCHAR(10);
    v_descripcion VARCHAR(120);
    v_persona_nombre VARCHAR(60);
    v_pagado NUMERIC;
    v_saldo NUMERIC;
BEGIN
    IF p_monto <= 0 THEN RAISE EXCEPTION 'El monto a pagar debe ser mayor a cero.'; END IF;
    SELECT d.monto, d.estado, d.tipo, d.descripcion, p.nombre
    INTO v_monto_total, v_estado, v_tipo, v_descripcion, v_persona_nombre
    FROM deudas d JOIN personas p ON p.id = d.persona_id
    WHERE d.id = p_deuda_id AND d.usuario_id = p_usuario_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'La deuda indicada no existe.'; END IF;
    IF v_estado = 'saldado' THEN RAISE EXCEPTION 'La deuda ya está saldada.'; END IF;
    SELECT COALESCE(SUM(monto), 0) INTO v_pagado FROM pagos_deuda WHERE deuda_id = p_deuda_id;
    v_saldo := v_monto_total - v_pagado;
    IF p_monto > v_saldo THEN RAISE EXCEPTION 'El monto no puede superar el saldo pendiente.'; END IF;

    INSERT INTO pagos_deuda (deuda_id, monto) VALUES (p_deuda_id, p_monto);
    IF p_monto = v_saldo THEN
        UPDATE deudas SET estado = 'saldado', saldado_en = CURRENT_TIMESTAMP WHERE id = p_deuda_id;
    END IF;
    PERFORM registrar_movimiento_pago_deuda(p_usuario_id, v_tipo, p_monto, v_descripcion, p_monto <> v_saldo, v_persona_nombre);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION eliminar_pago(p_usuario_id INTEGER, p_pago_id INTEGER) RETURNS VOID AS $$
DECLARE v_deuda_id INTEGER;
BEGIN
    SELECT pg.deuda_id INTO v_deuda_id
    FROM pagos_deuda pg JOIN deudas d ON d.id = pg.deuda_id
    WHERE pg.id = p_pago_id AND d.usuario_id = p_usuario_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'El pago indicado no existe.'; END IF;
    DELETE FROM pagos_deuda WHERE id = p_pago_id;
    UPDATE deudas SET estado = 'pendiente', saldado_en = NULL
    WHERE id = v_deuda_id AND estado = 'saldado';
END;
$$ LANGUAGE plpgsql;
