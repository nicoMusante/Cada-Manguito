--------------------------------------------------------------------------
-- MIGRACIÓN: fechas ancladas al huso horario de Argentina.
-- Neon corre en GMT: todo lo que dependía de CURRENT_DATE (fecha default de
-- movimientos/deudas/pagos, día de gastos fijos) quedaba fechado un día
-- adelante entre las 21hs y las 00hs de Argentina, que es cuando en UTC ya
-- es el día siguiente. Un ALTER DATABASE ... SET timezone no alcanza: el
-- driver HTTP (@neondatabase/serverless) abre una sesión nueva por cada
-- query y no hereda ese default (verificado a mano). La solución es la
-- función hoy_ar(), que resuelve el huso horario explícito con AT TIME ZONE
-- y reemplaza a CURRENT_DATE en cada default/función de fecha.
-- Es seguro correrla más de una vez.
--------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hoy_ar() RETURNS DATE AS $$
    SELECT (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
$$ LANGUAGE sql STABLE;

ALTER TABLE movimientos  ALTER COLUMN fecha SET DEFAULT hoy_ar();
ALTER TABLE deudas       ALTER COLUMN fecha SET DEFAULT hoy_ar();
ALTER TABLE pagos_deuda  ALTER COLUMN fecha SET DEFAULT hoy_ar();
ALTER TABLE gastos_fijos ALTER COLUMN mes_inicio SET DEFAULT TO_CHAR(hoy_ar(), 'YYYY-MM');

CREATE OR REPLACE FUNCTION crear_gasto_fijo(
    p_usuario_id      INTEGER,
    p_categoria_id    INTEGER,
    p_descripcion     VARCHAR,
    p_monto           NUMERIC,
    p_dia_mes         INTEGER,
    p_proximo_mes     BOOLEAN DEFAULT FALSE,
    p_cuotas_totales  INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_tipo        VARCHAR(10);
    v_activo      BOOLEAN;
    v_id          INTEGER;
    v_mes_inicio  VARCHAR(7);
    v_mes_fin     VARCHAR(7);
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
    IF p_cuotas_totales IS NOT NULL AND p_cuotas_totales < 1 THEN
        RAISE EXCEPTION 'La cantidad de cuotas tiene que ser mayor a 0.';
    END IF;

    v_mes_inicio := TO_CHAR(CASE WHEN p_proximo_mes THEN hoy_ar() + INTERVAL '1 month' ELSE hoy_ar() END, 'YYYY-MM');
    IF p_cuotas_totales IS NOT NULL THEN
        v_mes_fin := TO_CHAR(TO_DATE(v_mes_inicio || '-01', 'YYYY-MM-DD') + ((p_cuotas_totales - 1) * INTERVAL '1 month'), 'YYYY-MM');
    END IF;

    INSERT INTO gastos_fijos (usuario_id, categoria_id, descripcion, monto, dia_mes, mes_inicio, cuotas_totales, mes_fin)
    VALUES (p_usuario_id, p_categoria_id, p_descripcion, p_monto, p_dia_mes, v_mes_inicio, p_cuotas_totales, v_mes_fin)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generar_gastos_fijos_pendientes(p_usuario_id INTEGER) RETURNS INTEGER AS $$
DECLARE
    v_gf      RECORD;
    v_fecha   DATE;
    v_hoy     DATE := hoy_ar();
    v_periodo VARCHAR(7);
    v_creados INTEGER := 0;
BEGIN
    v_periodo := TO_CHAR(v_hoy, 'YYYY-MM');
    FOR v_gf IN SELECT * FROM gastos_fijos WHERE activo = true AND usuario_id = p_usuario_id LOOP
        IF v_periodo >= v_gf.mes_inicio
           AND (v_gf.mes_fin IS NULL OR v_periodo <= v_gf.mes_fin)
           AND EXTRACT(DAY FROM v_hoy) >= v_gf.dia_mes
           AND NOT EXISTS (
            SELECT 1 FROM movimientos
            WHERE gasto_fijo_id = v_gf.id
              AND TO_CHAR(fecha, 'YYYY-MM') = v_periodo
        ) THEN
            v_fecha := make_date(EXTRACT(YEAR FROM v_hoy)::int, EXTRACT(MONTH FROM v_hoy)::int, v_gf.dia_mes);
            INSERT INTO movimientos (usuario_id, categoria_id, descripcion, monto, fecha, gasto_fijo_id)
            VALUES (p_usuario_id, v_gf.categoria_id, v_gf.descripcion, v_gf.monto, v_fecha, v_gf.id);
            v_creados := v_creados + 1;
        END IF;
    END LOOP;
    RETURN v_creados;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION insertar_movimiento(
    p_usuario_id    INTEGER,
    p_categoria_id  INTEGER,
    p_descripcion   VARCHAR,
    p_monto         NUMERIC,
    p_fecha         DATE DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_activo BOOLEAN;
    v_id     INTEGER;
BEGIN
    SELECT activo INTO v_activo FROM categorias WHERE id = p_categoria_id AND usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La categoría indicada no existe.';
    END IF;
    IF NOT v_activo THEN
        RAISE EXCEPTION 'La categoría seleccionada está inactiva.';
    END IF;

    INSERT INTO movimientos (usuario_id, categoria_id, descripcion, monto, fecha)
    VALUES (p_usuario_id, p_categoria_id, p_descripcion, p_monto, COALESCE(p_fecha, hoy_ar()))
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crear_deuda(
    p_usuario_id      INTEGER,
    p_persona_nombre  VARCHAR,
    p_tipo            VARCHAR,
    p_monto           NUMERIC,
    p_descripcion     VARCHAR,
    p_fecha           DATE DEFAULT NULL,
    p_movimiento_id   INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_persona_id INTEGER;
    v_id         INTEGER;
BEGIN
    v_persona_id := obtener_o_crear_persona(p_usuario_id, p_persona_nombre);

    INSERT INTO deudas (usuario_id, persona_id, tipo, monto, descripcion, fecha, movimiento_id, estado)
    VALUES (p_usuario_id, v_persona_id, p_tipo, p_monto, p_descripcion, COALESCE(p_fecha, hoy_ar()), p_movimiento_id, 'pendiente')
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION evolucion_mensual(p_usuario_id INTEGER, p_cant_meses INTEGER DEFAULT 6)
RETURNS TABLE (periodo TEXT, ingresos NUMERIC, gastos NUMERIC, saldo NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.periodo,
        COALESCE(SUM(CASE WHEN v.tipo = 'INGRESO' THEN v.monto END), 0),
        COALESCE(SUM(CASE WHEN v.tipo = 'GASTO'   THEN v.monto END), 0),
        COALESCE(SUM(v.monto_con_signo), 0)
    FROM v_movimientos v
    WHERE v.usuario_id = p_usuario_id
      AND v.mes >= (DATE_TRUNC('month', hoy_ar()) - (p_cant_meses - 1) * INTERVAL '1 month')
    GROUP BY v.periodo
    ORDER BY v.periodo;
END;
$$ LANGUAGE plpgsql;
