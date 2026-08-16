-- Migración puntual (idempotente): agrega actualizar_gasto_fijo y generaliza
-- la descripción del movimiento espejo de crear_deuda (ya no asume "Préstamo").
-- Ya está incluida en db/schema.sql, esto es sólo para aplicarla sobre la base real.

CREATE OR REPLACE FUNCTION actualizar_gasto_fijo(
    p_usuario_id    INTEGER,
    p_id            INTEGER,
    p_categoria_id  INTEGER,
    p_descripcion   VARCHAR,
    p_monto         NUMERIC,
    p_dia_mes       INTEGER
) RETURNS VOID AS $$
DECLARE
    v_tipo    VARCHAR(10);
    v_activo  BOOLEAN;
BEGIN
    SELECT tipo, activo INTO v_tipo, v_activo FROM categorias WHERE id = p_categoria_id AND usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La categoría indicada no existe.';
    END IF;
    IF NOT v_activo THEN
        RAISE EXCEPTION 'La categoría seleccionada está inactiva.';
    END IF;
    IF v_tipo != 'GASTO' THEN
        RAISE EXCEPTION 'Un gasto fijo tiene que usar una categoría de tipo GASTO.';
    END IF;

    UPDATE gastos_fijos
    SET categoria_id = p_categoria_id, descripcion = p_descripcion, monto = p_monto, dia_mes = p_dia_mes
    WHERE id = p_id AND usuario_id = p_usuario_id AND activo = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El gasto fijo indicado no existe.';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crear_deuda(
    p_usuario_id            INTEGER,
    p_persona_nombre        VARCHAR,
    p_tipo                  VARCHAR,   -- 'ME_DEBEN' o 'YO_DEBO'
    p_monto                 NUMERIC,
    p_descripcion           VARCHAR,
    p_fecha                 DATE DEFAULT NULL,
    p_movimiento_id         INTEGER DEFAULT NULL,
    p_registrar_movimiento  BOOLEAN DEFAULT false
) RETURNS INTEGER AS $$
DECLARE
    v_persona_id    INTEGER;
    v_id            INTEGER;
    v_fecha         DATE;
    v_tipo_mov      VARCHAR(10);
    v_categoria_id  INTEGER;
BEGIN
    v_persona_id := obtener_o_crear_persona(p_usuario_id, p_persona_nombre);
    v_fecha := COALESCE(p_fecha, hoy_ar());

    INSERT INTO deudas (usuario_id, persona_id, tipo, monto, descripcion, fecha, movimiento_id, estado)
    VALUES (p_usuario_id, v_persona_id, p_tipo, p_monto, p_descripcion, v_fecha, p_movimiento_id, 'pendiente')
    RETURNING id INTO v_id;

    IF p_registrar_movimiento AND p_movimiento_id IS NULL THEN
        v_tipo_mov := CASE WHEN p_tipo = 'ME_DEBEN' THEN 'GASTO' ELSE 'INGRESO' END;
        v_categoria_id := obtener_o_crear_categoria_pago_deuda(p_usuario_id, v_tipo_mov);

        -- descripción genérica: no asume préstamo, sólo qué fue y con quién
        -- ("Entradas al cine (a Fede)" / "Alquiler compartido (de Fede)")
        INSERT INTO movimientos (usuario_id, categoria_id, descripcion, monto, tipo, fecha)
        VALUES (
            p_usuario_id,
            v_categoria_id,
            LEFT(
                TRIM(p_descripcion) || ' (' || CASE WHEN p_tipo = 'ME_DEBEN' THEN 'a ' ELSE 'de ' END || TRIM(p_persona_nombre) || ')',
                120
            ),
            p_monto,
            v_tipo_mov,
            v_fecha
        );
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;
