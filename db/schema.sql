--------------------------------------------------------------------------
-- ESQUEMA COMPLETO — Cada Manguito (PostgreSQL / Neon)
-- Consolidado al 21 Jul 2026. Idempotente: se puede correr de nuevo sin romper nada.
--------------------------------------------------------------------------

-- ========================= TABLAS =========================

CREATE TABLE IF NOT EXISTS categorias (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       VARCHAR(40)  NOT NULL UNIQUE,
    tipo         VARCHAR(10)  NOT NULL,          -- 'INGRESO' o 'GASTO'
    color_hex    VARCHAR(7),
    icono        VARCHAR(30),
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_categoria_tipo CHECK (tipo IN ('INGRESO', 'GASTO'))
);

CREATE TABLE IF NOT EXISTS movimientos (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_id   INTEGER       NOT NULL REFERENCES categorias(id),
    descripcion    VARCHAR(120)  NOT NULL,
    monto          NUMERIC(14,2) NOT NULL,       -- siempre positivo; el signo lo da categorias.tipo
    fecha          DATE          NOT NULL DEFAULT CURRENT_DATE,
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_monto_positivo CHECK (monto > 0)
);
CREATE INDEX IF NOT EXISTS ix_movimientos_fecha     ON movimientos (fecha);
CREATE INDEX IF NOT EXISTS ix_movimientos_cat_fecha ON movimientos (categoria_id, fecha);

CREATE TABLE IF NOT EXISTS personas (
    id       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre   VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS deudas (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    persona_id     INTEGER       NOT NULL REFERENCES personas(id),
    tipo           VARCHAR(10)   NOT NULL,       -- 'ME_DEBEN' o 'YO_DEBO'
    monto          NUMERIC(14,2) NOT NULL,
    descripcion    VARCHAR(120),
    fecha          DATE          NOT NULL DEFAULT CURRENT_DATE,
    estado         VARCHAR(10)   NOT NULL DEFAULT 'pendiente',  -- 'pendiente' o 'saldado'
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    movimiento_id  INTEGER REFERENCES movimientos(id),          -- opcional: gasto compartido que la originó
    saldado_en     TIMESTAMP,
    CONSTRAINT chk_deuda_tipo   CHECK (tipo IN ('ME_DEBEN', 'YO_DEBO')),
    CONSTRAINT chk_deuda_estado CHECK (estado IN ('pendiente', 'saldado')),
    CONSTRAINT chk_deuda_monto  CHECK (monto > 0)
);
CREATE INDEX IF NOT EXISTS ix_deudas_persona    ON deudas (persona_id);
CREATE INDEX IF NOT EXISTS ix_deudas_estado     ON deudas (estado);
CREATE INDEX IF NOT EXISTS ix_deudas_movimiento ON deudas (movimiento_id);

-- ========================= SEED =========================

INSERT INTO categorias (nombre, tipo, color_hex, icono) VALUES
    ('Sueldo',     'INGRESO', '#2F6F5E', 'wallet'),
    ('Freelance',  'INGRESO', '#3E7A63', 'wallet'),
    ('Padel',      'GASTO',   '#2F6F5E', 'dumbbell'),
    ('Casa',       'GASTO',   '#B8562F', 'home'),
    ('Servicios',  'GASTO',   '#8A6D3B', 'zap'),
    ('Comida',     'GASTO',   '#4A5D6B', 'coffee'),
    ('Compras',    'GASTO',   '#6B4A6B', 'shopping-bag')
ON CONFLICT (nombre) DO NOTHING;

-- ========================= VISTAS =========================

-- Movimientos con signo, categoría resuelta y período — base de reportes.
CREATE OR REPLACE VIEW v_movimientos AS
SELECT
    m.id,
    m.descripcion,
    c.nombre                                                   AS categoria,
    c.tipo,
    c.color_hex,
    c.icono,
    CASE WHEN c.tipo = 'GASTO' THEN -m.monto ELSE m.monto END   AS monto_con_signo,
    m.monto,
    m.fecha,
    DATE_TRUNC('month', m.fecha)::date                         AS mes,
    TO_CHAR(m.fecha, 'YYYY-MM')                                AS periodo,
    m.categoria_id
FROM movimientos m
JOIN categorias c ON c.id = m.categoria_id;

-- Personas con deuda pendiente: neto ya calculado + el detalle del último
-- pendiente (para el subtítulo de cada tarjeta en la pantalla de Personas).
CREATE OR REPLACE VIEW v_personas_activas AS
SELECT
    p.id AS persona_id,
    p.nombre,
    SUM(CASE WHEN d.tipo = 'ME_DEBEN' THEN d.monto ELSE -d.monto END) AS neto,
    (
        SELECT d2.descripcion || ' · ' || TO_CHAR(d2.fecha, 'DD Mon')
        FROM deudas d2
        WHERE d2.persona_id = p.id AND d2.estado = 'pendiente'
        ORDER BY d2.fecha DESC, d2.id DESC
        LIMIT 1
    ) AS ultimo_detalle
FROM personas p
JOIN deudas d ON d.persona_id = p.id
WHERE d.estado = 'pendiente'
GROUP BY p.id, p.nombre
HAVING SUM(CASE WHEN d.tipo = 'ME_DEBEN' THEN d.monto ELSE -d.monto END) != 0;

-- ========================= FUNCIONES: MOVIMIENTOS =========================

CREATE OR REPLACE FUNCTION insertar_movimiento(
    p_categoria_id  INTEGER,
    p_descripcion   VARCHAR,
    p_monto         NUMERIC,
    p_fecha         DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
    v_activo BOOLEAN;
    v_id     INTEGER;
BEGIN
    SELECT activo INTO v_activo FROM categorias WHERE id = p_categoria_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La categoría indicada no existe.';
    END IF;
    IF NOT v_activo THEN
        RAISE EXCEPTION 'La categoría seleccionada está inactiva.';
    END IF;

    INSERT INTO movimientos (categoria_id, descripcion, monto, fecha)
    VALUES (p_categoria_id, p_descripcion, p_monto, COALESCE(p_fecha, CURRENT_DATE))
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION actualizar_movimiento(
    p_id            INTEGER,
    p_categoria_id  INTEGER,
    p_descripcion   VARCHAR,
    p_monto         NUMERIC,
    p_fecha         DATE DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_activo BOOLEAN;
BEGIN
    SELECT activo INTO v_activo FROM categorias WHERE id = p_categoria_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La categoría indicada no existe.';
    END IF;
    IF NOT v_activo THEN
        RAISE EXCEPTION 'La categoría seleccionada está inactiva.';
    END IF;

    UPDATE movimientos
    SET categoria_id = p_categoria_id,
        descripcion  = p_descripcion,
        monto        = p_monto,
        fecha        = COALESCE(p_fecha, fecha)
    WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El movimiento indicado no existe.';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION eliminar_movimiento(p_id INTEGER) RETURNS VOID AS $$
BEGIN
    DELETE FROM movimientos WHERE id = p_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El movimiento indicado no existe.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Reportes (definidas, pero el frontend hoy todavía calcula estos totales
-- del lado del cliente — quedan disponibles para cuando se conecten).
CREATE OR REPLACE FUNCTION resumen_mes(p_anio INTEGER, p_mes INTEGER)
RETURNS TABLE (total_ingresos NUMERIC, total_gastos NUMERIC, saldo NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'GASTO'   THEN monto END), 0),
        COALESCE(SUM(monto_con_signo), 0)
    FROM v_movimientos
    WHERE EXTRACT(YEAR FROM fecha) = p_anio AND EXTRACT(MONTH FROM fecha) = p_mes;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION evolucion_mensual(p_cant_meses INTEGER DEFAULT 6)
RETURNS TABLE (periodo TEXT, ingresos NUMERIC, gastos NUMERIC, saldo NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v.periodo,
        COALESCE(SUM(CASE WHEN v.tipo = 'INGRESO' THEN v.monto END), 0),
        COALESCE(SUM(CASE WHEN v.tipo = 'GASTO'   THEN v.monto END), 0),
        COALESCE(SUM(v.monto_con_signo), 0)
    FROM v_movimientos v
    WHERE v.mes >= (DATE_TRUNC('month', CURRENT_DATE) - (p_cant_meses - 1) * INTERVAL '1 month')
    GROUP BY v.periodo
    ORDER BY v.periodo;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION gasto_por_categoria(p_anio INTEGER, p_mes INTEGER)
RETURNS TABLE (categoria VARCHAR, color_hex VARCHAR, icono VARCHAR, total NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT v.categoria, v.color_hex, v.icono, SUM(v.monto)
    FROM v_movimientos v
    WHERE v.tipo = 'GASTO' AND EXTRACT(YEAR FROM v.fecha) = p_anio AND EXTRACT(MONTH FROM v.fecha) = p_mes
    GROUP BY v.categoria, v.color_hex, v.icono
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================= FUNCIONES: PERSONAS / DEUDAS =========================

CREATE OR REPLACE FUNCTION obtener_o_crear_persona(p_nombre VARCHAR) RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
BEGIN
    SELECT id INTO v_id FROM personas WHERE nombre = TRIM(p_nombre);
    IF v_id IS NULL THEN
        INSERT INTO personas (nombre) VALUES (TRIM(p_nombre)) RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crear_deuda(
    p_persona_nombre VARCHAR,
    p_tipo            VARCHAR,   -- 'ME_DEBEN' o 'YO_DEBO'
    p_monto           NUMERIC,
    p_descripcion     VARCHAR,
    p_fecha           DATE DEFAULT CURRENT_DATE,
    p_movimiento_id   INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_persona_id INTEGER;
    v_id         INTEGER;
BEGIN
    v_persona_id := obtener_o_crear_persona(p_persona_nombre);

    INSERT INTO deudas (persona_id, tipo, monto, descripcion, fecha, movimiento_id, estado)
    VALUES (v_persona_id, p_tipo, p_monto, p_descripcion, COALESCE(p_fecha, CURRENT_DATE), p_movimiento_id, 'pendiente')
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION saldar_persona(p_persona_id INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE deudas
    SET estado = 'saldado', saldado_en = CURRENT_TIMESTAMP
    WHERE persona_id = p_persona_id AND estado = 'pendiente';
END;
$$ LANGUAGE plpgsql;
