--------------------------------------------------------------------------
-- MIGRACIÓN: mes de inicio y cuotas en gastos fijos.
-- Agrega:
--   - mes_inicio: período (YYYY-MM) desde el que el gasto fijo empieza a
--     generar movimientos (permite elegir "este mes" o "el próximo").
--   - cuotas_totales: cantidad de meses que se debe generar (null = sin
--     límite, recurrente para siempre, como era antes).
--   - mes_fin: último período (YYYY-MM) en el que se genera, calculado a
--     partir de mes_inicio + cuotas_totales al crear el gasto fijo.
-- Las filas existentes quedan con mes_inicio = mes actual y cuotas_totales
-- null, o sea con el mismo comportamiento que tenían antes de esto.
-- Usa IF NOT EXISTS / OR REPLACE, es seguro correrla más de una vez.
--------------------------------------------------------------------------

ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS mes_inicio VARCHAR(7) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM');
ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS cuotas_totales INTEGER;
ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS mes_fin VARCHAR(7);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_gasto_fijo_cuotas') THEN
        ALTER TABLE gastos_fijos ADD CONSTRAINT chk_gasto_fijo_cuotas CHECK (cuotas_totales IS NULL OR cuotas_totales > 0);
    END IF;
END $$;

-- la firma vieja (5 args) no alcanza más: la saco antes de crear la nueva
-- con proximo_mes/cuotas_totales, para que no queden las dos conviviendo
DROP FUNCTION IF EXISTS crear_gasto_fijo(INTEGER, INTEGER, VARCHAR, NUMERIC, INTEGER);

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

    v_mes_inicio := TO_CHAR(CASE WHEN p_proximo_mes THEN CURRENT_DATE + INTERVAL '1 month' ELSE CURRENT_DATE END, 'YYYY-MM');
    IF p_cuotas_totales IS NOT NULL THEN
        v_mes_fin := TO_CHAR(TO_DATE(v_mes_inicio || '-01', 'YYYY-MM-DD') + ((p_cuotas_totales - 1) * INTERVAL '1 month'), 'YYYY-MM');
    END IF;

    INSERT INTO gastos_fijos (usuario_id, categoria_id, descripcion, monto, dia_mes, mes_inicio, cuotas_totales, mes_fin)
    VALUES (p_usuario_id, p_categoria_id, p_descripcion, p_monto, p_dia_mes, v_mes_inicio, p_cuotas_totales, v_mes_fin)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ahora respeta mes_inicio/mes_fin además del día del mes
CREATE OR REPLACE FUNCTION generar_gastos_fijos_pendientes(p_usuario_id INTEGER) RETURNS INTEGER AS $$
DECLARE
    v_gf      RECORD;
    v_fecha   DATE;
    v_periodo VARCHAR(7);
    v_creados INTEGER := 0;
BEGIN
    v_periodo := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    FOR v_gf IN SELECT * FROM gastos_fijos WHERE activo = true AND usuario_id = p_usuario_id LOOP
        IF v_periodo >= v_gf.mes_inicio
           AND (v_gf.mes_fin IS NULL OR v_periodo <= v_gf.mes_fin)
           AND EXTRACT(DAY FROM CURRENT_DATE) >= v_gf.dia_mes
           AND NOT EXISTS (
            SELECT 1 FROM movimientos
            WHERE gasto_fijo_id = v_gf.id
              AND TO_CHAR(fecha, 'YYYY-MM') = v_periodo
        ) THEN
            v_fecha := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, v_gf.dia_mes);
            INSERT INTO movimientos (usuario_id, categoria_id, descripcion, monto, fecha, gasto_fijo_id)
            VALUES (p_usuario_id, v_gf.categoria_id, v_gf.descripcion, v_gf.monto, v_fecha, v_gf.id);
            v_creados := v_creados + 1;
        END IF;
    END LOOP;
    RETURN v_creados;
END;
$$ LANGUAGE plpgsql;
