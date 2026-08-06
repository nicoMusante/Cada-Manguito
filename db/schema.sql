--------------------------------------------------------------------------
-- ESQUEMA COMPLETO — Cada Manguito (PostgreSQL / Neon)
-- Consolidado al 2 Ago 2026. Idempotente: se puede correr de nuevo sin romper nada.
-- Multi-usuario: todas las tablas de datos (menos pagos_deuda) llevan
-- usuario_id. Para una base ya existente de antes de esto, correr
-- db/migracion_usuarios.sql (no idempotente, de un solo uso) en vez de
-- re-aplicar este archivo — los CREATE TABLE IF NOT EXISTS de acá no le
-- agregan columnas a tablas que ya existen.
--------------------------------------------------------------------------

-- ========================= HELPERS =========================

-- La app asume siempre el huso horario de Argentina: reemplaza a CURRENT_DATE
-- en todos los defaults/funciones de fecha (movimientos, deudas, pagos, día
-- de gastos fijos, etc.) para que reflejen el día calendario de Buenos Aires,
-- no el de UTC. Neon corre en GMT por default, y un ALTER DATABASE ... SET
-- timezone no alcanza: el driver HTTP (@neondatabase/serverless) abre una
-- sesión nueva por cada query y no hereda ese default — hay que resolver el
-- huso adentro de cada expresión, explícito, con AT TIME ZONE.
CREATE OR REPLACE FUNCTION hoy_ar() RETURNS DATE AS $$
    SELECT (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
$$ LANGUAGE sql STABLE;

-- ========================= TABLAS =========================

CREATE TABLE IF NOT EXISTS usuarios (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255),           -- null si sólo usa Google
    nombre         VARCHAR(80)  NOT NULL,
    google_id      VARCHAR(255) UNIQUE,
    tema           VARCHAR(20)  NOT NULL DEFAULT 'dark',  -- preferencia de tema de UI, ver lib/theme.ts (ThemeName)
    tipo_dolar     VARCHAR(20)  NOT NULL DEFAULT 'blue',  -- cotización a usar para mostrar equivalentes en USD, ver lib/dolar.ts (DolarTipo)
    creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id   INTEGER      NOT NULL REFERENCES usuarios(id),
    nombre       VARCHAR(40)  NOT NULL,
    tipo         VARCHAR(10)  NOT NULL,          -- 'INGRESO' o 'GASTO'
    color_hex    VARCHAR(7),
    icono        VARCHAR(30),
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_categoria_tipo CHECK (tipo IN ('INGRESO', 'GASTO')),
    CONSTRAINT uq_categoria_nombre_usuario UNIQUE (nombre, usuario_id)
);

-- Gastos fijos/recurrentes (alquiler, suscripciones, etc.): cada mes que se
-- entra a la app con dia_mes ya cumplido, se genera solo el movimiento real
-- correspondiente (ver generar_gastos_fijos_pendientes).
CREATE TABLE IF NOT EXISTS gastos_fijos (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      INTEGER       NOT NULL REFERENCES usuarios(id),
    categoria_id    INTEGER       NOT NULL REFERENCES categorias(id),
    descripcion     VARCHAR(120)  NOT NULL,
    monto           NUMERIC(14,2) NOT NULL,
    dia_mes         INTEGER       NOT NULL DEFAULT 1,
    mes_inicio      VARCHAR(7)    NOT NULL DEFAULT TO_CHAR(hoy_ar(), 'YYYY-MM'), -- período (YYYY-MM) desde el que empieza a generar movimientos
    cuotas_totales  INTEGER,                                                        -- cantidad de meses a generar; null = recurrente sin límite
    mes_fin         VARCHAR(7),                                                     -- último período que genera, calculado a partir de mes_inicio + cuotas_totales
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_gasto_fijo_monto_positivo CHECK (monto > 0),
    CONSTRAINT chk_gasto_fijo_dia CHECK (dia_mes BETWEEN 1 AND 28),
    CONSTRAINT chk_gasto_fijo_cuotas CHECK (cuotas_totales IS NULL OR cuotas_totales > 0)
);

CREATE TABLE IF NOT EXISTS movimientos (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id     INTEGER       NOT NULL REFERENCES usuarios(id),
    categoria_id   INTEGER       NOT NULL REFERENCES categorias(id),
    descripcion    VARCHAR(120)  NOT NULL,
    monto          NUMERIC(14,2) NOT NULL,       -- nunca negativo; el signo lo da categorias.tipo
    fecha          DATE          NOT NULL DEFAULT hoy_ar(),
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gasto_fijo_id  INTEGER       REFERENCES gastos_fijos(id),  -- si no es null, este movimiento lo generó un gasto fijo
    -- moneda en la que se cargó el movimiento. "monto" arriba SIEMPRE queda en
    -- ARS (el equivalente en pesos al momento de cargar, para que resumen_mes/
    -- evolucion_mensual/gasto_por_categoria sigan sumando todo en la misma
    -- moneda sin tocarlos); monto_original guarda lo que se tipeó en dólares,
    -- sólo para mostrarlo tal cual en la UI. El tipo de cambio usado queda
    -- congelado en ese momento, no se recalcula después.
    moneda         VARCHAR(3)    NOT NULL DEFAULT 'ARS',
    monto_original NUMERIC(14,2),
    -- puede llegar a 0 si un gasto compartido se cobra por completo (ver
    -- pagar_movimiento/saldar_persona/saldar_deudas/eliminar_deuda, que
    -- descuentan de acá la parte ya cobrada de la deuda vinculada)
    CONSTRAINT chk_monto_positivo CHECK (monto >= 0),
    CONSTRAINT chk_movimiento_moneda CHECK (moneda IN ('ARS', 'USD'))
);
CREATE INDEX IF NOT EXISTS ix_movimientos_fecha      ON movimientos (fecha);
CREATE INDEX IF NOT EXISTS ix_movimientos_cat_fecha  ON movimientos (categoria_id, fecha);
CREATE INDEX IF NOT EXISTS ix_movimientos_gasto_fijo ON movimientos (gasto_fijo_id);
CREATE INDEX IF NOT EXISTS ix_movimientos_usuario    ON movimientos (usuario_id);

CREATE TABLE IF NOT EXISTS personas (
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id   INTEGER      NOT NULL REFERENCES usuarios(id),
    nombre       VARCHAR(60)  NOT NULL,
    CONSTRAINT uq_persona_nombre_usuario UNIQUE (nombre, usuario_id)
);

CREATE TABLE IF NOT EXISTS deudas (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id     INTEGER       NOT NULL REFERENCES usuarios(id),
    persona_id     INTEGER       NOT NULL REFERENCES personas(id),
    tipo           VARCHAR(10)   NOT NULL,       -- 'ME_DEBEN' o 'YO_DEBO'
    monto          NUMERIC(14,2) NOT NULL,
    descripcion    VARCHAR(120),
    fecha          DATE          NOT NULL DEFAULT hoy_ar(),
    estado         VARCHAR(10)   NOT NULL DEFAULT 'pendiente',  -- 'pendiente' o 'saldado'
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- opcional: gasto compartido que la originó. ON DELETE CASCADE porque si
    -- se borra el movimiento, las deudas que generó dejan de tener sentido
    movimiento_id  INTEGER REFERENCES movimientos(id) ON DELETE CASCADE,
    saldado_en     TIMESTAMP,
    CONSTRAINT chk_deuda_tipo   CHECK (tipo IN ('ME_DEBEN', 'YO_DEBO')),
    CONSTRAINT chk_deuda_estado CHECK (estado IN ('pendiente', 'saldado')),
    CONSTRAINT chk_deuda_monto  CHECK (monto > 0)
);
CREATE INDEX IF NOT EXISTS ix_deudas_persona    ON deudas (persona_id);
CREATE INDEX IF NOT EXISTS ix_deudas_estado     ON deudas (estado);
CREATE INDEX IF NOT EXISTS ix_deudas_movimiento ON deudas (movimiento_id);
CREATE INDEX IF NOT EXISTS ix_deudas_usuario    ON deudas (usuario_id);

-- Pagos parciales ("cuotas") contra una entrada puntual de deudas. El monto
-- original de la deuda no se toca nunca: el saldo pendiente de cada entrada
-- es siempre monto - SUM(pagos_deuda.monto). No lleva usuario_id propio: el
-- dueño siempre se valida a través de deudas.usuario_id (ver eliminar_pago).
CREATE TABLE IF NOT EXISTS pagos_deuda (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deuda_id    INTEGER       NOT NULL REFERENCES deudas(id) ON DELETE CASCADE,
    monto       NUMERIC(14,2) NOT NULL,
    fecha       DATE          NOT NULL DEFAULT hoy_ar(),
    creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pago_deuda_monto_positivo CHECK (monto > 0)
);
CREATE INDEX IF NOT EXISTS ix_pagos_deuda_deuda ON pagos_deuda (deuda_id);

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
    m.categoria_id,
    m.usuario_id,
    m.moneda,
    m.monto_original
FROM movimientos m
JOIN categorias c ON c.id = m.categoria_id;

-- Personas con deuda pendiente: neto ya calculado + el detalle del último
-- pendiente (para el subtítulo de cada tarjeta en la pantalla de Personas).
-- El neto usa el saldo pendiente de cada deuda (monto menos lo ya pagado en
-- cuotas vía pagos_deuda), no el monto original.
CREATE OR REPLACE VIEW v_personas_activas AS
SELECT
    p.id AS persona_id,
    p.nombre,
    SUM(CASE WHEN d.tipo = 'ME_DEBEN' THEN (d.monto - COALESCE(pg.pagado, 0)) ELSE -(d.monto - COALESCE(pg.pagado, 0)) END) AS neto,
    (
        -- TO_CHAR con 'Mon' depende del locale del servidor (en Neon es
        -- inglés, ej. "Aug"); arma el mes abreviado a mano para que salga
        -- siempre en español sin importar el locale de Postgres.
        SELECT d2.descripcion || ' · ' || TO_CHAR(d2.fecha, 'DD') || ' ' ||
               (ARRAY['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[EXTRACT(MONTH FROM d2.fecha)::int]
        FROM deudas d2
        WHERE d2.persona_id = p.id AND d2.estado = 'pendiente'
        ORDER BY d2.fecha DESC, d2.id DESC
        LIMIT 1
    ) AS ultimo_detalle,
    p.usuario_id
FROM personas p
JOIN deudas d ON d.persona_id = p.id
LEFT JOIN LATERAL (
    SELECT SUM(monto) AS pagado FROM pagos_deuda WHERE deuda_id = d.id
) pg ON true
WHERE d.estado = 'pendiente'
GROUP BY p.id, p.usuario_id, p.nombre
HAVING SUM(CASE WHEN d.tipo = 'ME_DEBEN' THEN (d.monto - COALESCE(pg.pagado, 0)) ELSE -(d.monto - COALESCE(pg.pagado, 0)) END) != 0;

-- ========================= FUNCIONES: USUARIOS =========================

-- Clona las categorías default para una cuenta recién creada (registro por
-- mail o primer login con Google). Se llama una sola vez, al alta.
CREATE OR REPLACE FUNCTION sembrar_categorias_default(p_usuario_id INTEGER) RETURNS VOID AS $$
BEGIN
    INSERT INTO categorias (usuario_id, nombre, tipo, color_hex, icono) VALUES
        (p_usuario_id, 'Sueldo',         'INGRESO', '#2F6F5E', 'wallet'),
        (p_usuario_id, 'Freelance',      'INGRESO', '#3E7A63', 'wallet'),
        (p_usuario_id, 'Otros ingresos', 'INGRESO', '#C9A227', 'wallet'),
        (p_usuario_id, 'Casa',           'GASTO',   '#B8562F', 'home'),
        (p_usuario_id, 'Servicios',      'GASTO',   '#8A6D3B', 'zap'),
        (p_usuario_id, 'Comida',         'GASTO',   '#4A5D6B', 'coffee'),
        (p_usuario_id, 'Compras',        'GASTO',   '#6B4A6B', 'shopping-bag'),
        (p_usuario_id, 'Transporte',     'GASTO',   '#35507A', 'car'),
        (p_usuario_id, 'Salud',          'GASTO',   '#A63E3E', 'heart'),
        (p_usuario_id, 'Entretenimiento','GASTO',   '#4B4B8A', 'film'),
        (p_usuario_id, 'Suscripciones',  'GASTO',   '#55606B', 'smartphone'),
        (p_usuario_id, 'Regalos',        'GASTO',   '#8A4B6B', 'gift'),
        (p_usuario_id, 'Ropa',           'GASTO',   '#9C4A2E', 'shirt'),
        (p_usuario_id, 'Mascotas',       'GASTO',   '#2E5A3E', 'paw-print'),
        (p_usuario_id, 'Educación',      'GASTO',   '#3E6B7A', 'graduation-cap')
    ON CONFLICT (nombre, usuario_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Recicla el id de usuario: después de cualquier borrado, resincroniza la
-- secuencia de la identity column al MAX(id) actual. Así, si se borra la
-- cuenta con el id más alto, el próximo alta vuelve a usar ese mismo id en
-- vez de dejarlo perdido para siempre (sólo relevante en la cola: borrar un
-- id intermedio no genera ningún efecto, la secuencia sigue igual).
CREATE OR REPLACE FUNCTION reciclar_id_usuario() RETURNS trigger AS $$
BEGIN
    PERFORM setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE((SELECT MAX(id) FROM usuarios), 1));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reciclar_id_usuario ON usuarios;
CREATE TRIGGER trg_reciclar_id_usuario
    AFTER DELETE ON usuarios
    FOR EACH STATEMENT
    EXECUTE FUNCTION reciclar_id_usuario();

-- ========================= FUNCIONES: CATEGORIAS =========================

-- Baja lógica: no se borra la fila (los movimientos históricos siguen
-- necesitando su categoria_id), sólo deja de listarse como activa.
CREATE OR REPLACE FUNCTION eliminar_categoria(p_usuario_id INTEGER, p_id INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE categorias SET activo = false WHERE id = p_id AND usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La categoría indicada no existe.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================= FUNCIONES: GASTOS FIJOS =========================

CREATE OR REPLACE FUNCTION crear_gasto_fijo(
    p_usuario_id      INTEGER,
    p_categoria_id    INTEGER,
    p_descripcion     VARCHAR,
    p_monto           NUMERIC,
    p_dia_mes         INTEGER,
    p_proximo_mes     BOOLEAN DEFAULT FALSE,  -- true = empieza a generar recién el mes que viene
    p_cuotas_totales  INTEGER DEFAULT NULL    -- null = recurrente sin límite; si no, cantidad de meses a generar
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

-- Baja lógica: deja de generar movimientos nuevos, pero los que ya generó
-- quedan intactos en el historial.
CREATE OR REPLACE FUNCTION eliminar_gasto_fijo(p_usuario_id INTEGER, p_id INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE gastos_fijos SET activo = false WHERE id = p_id AND usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El gasto fijo indicado no existe.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Recorre los gastos fijos activos del usuario y, para cada uno cuyo día del
-- mes ya llegó y todavía no tiene un movimiento generado en el mes en curso,
-- crea ese movimiento. Se llama sola desde GET /api/movimientos cuando se
-- pide el mes actual — no hace falta ningún cron aparte.
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

-- ========================= FUNCIONES: MOVIMIENTOS =========================

CREATE OR REPLACE FUNCTION insertar_movimiento(
    p_usuario_id      INTEGER,
    p_categoria_id    INTEGER,
    p_descripcion     VARCHAR,
    p_monto           NUMERIC,
    p_fecha           DATE DEFAULT NULL,
    p_moneda          VARCHAR DEFAULT 'ARS',   -- monto ya viene convertido a ARS; esto es sólo para mostrar el original
    p_monto_original  NUMERIC DEFAULT NULL
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

    INSERT INTO movimientos (usuario_id, categoria_id, descripcion, monto, fecha, moneda, monto_original)
    VALUES (p_usuario_id, p_categoria_id, p_descripcion, p_monto, COALESCE(p_fecha, hoy_ar()), COALESCE(p_moneda, 'ARS'), p_monto_original)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION actualizar_movimiento(
    p_usuario_id      INTEGER,
    p_id              INTEGER,
    p_categoria_id    INTEGER,
    p_descripcion     VARCHAR,
    p_monto           NUMERIC,
    p_fecha           DATE DEFAULT NULL,
    p_moneda          VARCHAR DEFAULT 'ARS',
    p_monto_original  NUMERIC DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_activo BOOLEAN;
BEGIN
    SELECT activo INTO v_activo FROM categorias WHERE id = p_categoria_id AND usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La categoría indicada no existe.';
    END IF;
    IF NOT v_activo THEN
        RAISE EXCEPTION 'La categoría seleccionada está inactiva.';
    END IF;

    UPDATE movimientos
    SET categoria_id    = p_categoria_id,
        descripcion     = p_descripcion,
        monto           = p_monto,
        fecha           = COALESCE(p_fecha, fecha),
        moneda          = COALESCE(p_moneda, 'ARS'),
        monto_original  = p_monto_original
    WHERE id = p_id AND usuario_id = p_usuario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El movimiento indicado no existe.';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION eliminar_movimiento(p_usuario_id INTEGER, p_id INTEGER) RETURNS VOID AS $$
BEGIN
    DELETE FROM movimientos WHERE id = p_id AND usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El movimiento indicado no existe.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Reportes (definidas, pero el frontend hoy todavía calcula estos totales
-- del lado del cliente — quedan disponibles para cuando se conecten).
CREATE OR REPLACE FUNCTION resumen_mes(p_usuario_id INTEGER, p_anio INTEGER, p_mes INTEGER)
RETURNS TABLE (total_ingresos NUMERIC, total_gastos NUMERIC, saldo NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' THEN monto END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'GASTO'   THEN monto END), 0),
        COALESCE(SUM(monto_con_signo), 0)
    FROM v_movimientos
    WHERE usuario_id = p_usuario_id AND EXTRACT(YEAR FROM fecha) = p_anio AND EXTRACT(MONTH FROM fecha) = p_mes;
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

CREATE OR REPLACE FUNCTION gasto_por_categoria(p_usuario_id INTEGER, p_anio INTEGER, p_mes INTEGER)
RETURNS TABLE (categoria VARCHAR, color_hex VARCHAR, icono VARCHAR, total NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT v.categoria, v.color_hex, v.icono, SUM(v.monto)
    FROM v_movimientos v
    WHERE v.usuario_id = p_usuario_id AND v.tipo = 'GASTO' AND EXTRACT(YEAR FROM v.fecha) = p_anio AND EXTRACT(MONTH FROM v.fecha) = p_mes
    GROUP BY v.categoria, v.color_hex, v.icono
    ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================= FUNCIONES: PERSONAS / DEUDAS =========================

CREATE OR REPLACE FUNCTION obtener_o_crear_persona(p_usuario_id INTEGER, p_nombre VARCHAR) RETURNS INTEGER AS $$
DECLARE
    v_id INTEGER;
BEGIN
    SELECT id INTO v_id FROM personas WHERE nombre = TRIM(p_nombre) AND usuario_id = p_usuario_id;
    IF v_id IS NULL THEN
        INSERT INTO personas (usuario_id, nombre) VALUES (p_usuario_id, TRIM(p_nombre)) RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Categorías especiales para los movimientos que se generan solos al pagar
-- una deuda (ver registrar_movimiento_pago_deuda). No pueden compartir
-- nombre entre sí porque categorias tiene UNIQUE(nombre, usuario_id) sin
-- distinguir tipo, así que uso un nombre por tipo. Idempotente: si ya existe
-- la reutiliza (y la reactiva si el usuario la había dado de baja).
CREATE OR REPLACE FUNCTION obtener_o_crear_categoria_pago_deuda(p_usuario_id INTEGER, p_tipo VARCHAR) RETURNS INTEGER AS $$
DECLARE
    v_id      INTEGER;
    v_nombre  VARCHAR(40);
BEGIN
    v_nombre := CASE WHEN p_tipo = 'INGRESO' THEN 'Cobros' ELSE 'Deudas' END;

    SELECT id INTO v_id FROM categorias WHERE usuario_id = p_usuario_id AND nombre = v_nombre;
    IF v_id IS NULL THEN
        INSERT INTO categorias (usuario_id, nombre, tipo, color_hex, icono)
        VALUES (p_usuario_id, v_nombre, p_tipo, CASE WHEN p_tipo = 'INGRESO' THEN '#2F6F5E' ELSE '#8A4B6B' END, 'hand-coins')
        RETURNING id INTO v_id;
    ELSE
        UPDATE categorias SET activo = true WHERE id = v_id AND activo = false;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Genera el movimiento real (ingreso o gasto) que corresponde cuando se
-- cobra o se paga una deuda puntual. Sólo se llama para deudas standalone
-- (sin movimiento_id): las que vienen de un gasto compartido ya se
-- reconcilian descontando del movimiento original (ver pagar_movimiento/
-- saldar_deudas/saldar_persona), así que generar acá otro movimiento
-- duplicaría la plata.
CREATE OR REPLACE FUNCTION registrar_movimiento_pago_deuda(
    p_usuario_id           INTEGER,
    p_tipo_deuda           VARCHAR,  -- 'ME_DEBEN' o 'YO_DEBO'
    p_monto                NUMERIC,
    p_descripcion_deuda    VARCHAR,
    p_parcial              BOOLEAN,
    p_persona_nombre       VARCHAR
) RETURNS VOID AS $$
DECLARE
    v_tipo_mov      VARCHAR(10);
    v_categoria_id  INTEGER;
    v_texto         VARCHAR(120);
BEGIN
    v_tipo_mov := CASE WHEN p_tipo_deuda = 'ME_DEBEN' THEN 'INGRESO' ELSE 'GASTO' END;
    v_categoria_id := obtener_o_crear_categoria_pago_deuda(p_usuario_id, v_tipo_mov);
    -- "cobro" cuando me pagan (ME_DEBEN), "pago" cuando yo pago (YO_DEBO)
    v_texto := LEFT(
        CASE
            WHEN p_tipo_deuda = 'ME_DEBEN' AND p_parcial     THEN 'Cobro parcial de deuda a '
            WHEN p_tipo_deuda = 'ME_DEBEN' AND NOT p_parcial THEN 'Cobro de deuda a '
            WHEN p_tipo_deuda = 'YO_DEBO'  AND p_parcial     THEN 'Pago parcial de deuda de '
            ELSE                                                  'Pago de deuda de '
        END || p_persona_nombre || ' (' || p_descripcion_deuda || ')',
        120
    );

    INSERT INTO movimientos (usuario_id, categoria_id, descripcion, monto)
    VALUES (p_usuario_id, v_categoria_id, v_texto, p_monto);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crear_deuda(
    p_usuario_id      INTEGER,
    p_persona_nombre  VARCHAR,
    p_tipo            VARCHAR,   -- 'ME_DEBEN' o 'YO_DEBO'
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

-- Si la deuda que se salda vino de un gasto compartido (movimiento_id), la
-- parte todavía no cobrada pasa a contar como gasto propio en ese movimiento
-- (ver misma lógica en pagar_movimiento y eliminar_deuda). Si es una deuda
-- standalone (sin movimiento_id), en cambio, se genera un movimiento real
-- nuevo por lo que quedaba pendiente (ver registrar_movimiento_pago_deuda) —
-- las dos rutas son mutuamente excluyentes para no duplicar la plata.
CREATE OR REPLACE FUNCTION saldar_persona(p_usuario_id INTEGER, p_persona_id INTEGER) RETURNS VOID AS $$
DECLARE
    v_deuda RECORD;
BEGIN
    FOR v_deuda IN
        SELECT d.id, d.tipo, d.monto, d.descripcion, d.movimiento_id, p.nombre AS persona_nombre, COALESCE(SUM(pg.monto), 0) AS pagado
        FROM deudas d
        JOIN personas p ON p.id = d.persona_id
        LEFT JOIN pagos_deuda pg ON pg.deuda_id = d.id
        WHERE d.persona_id = p_persona_id AND d.usuario_id = p_usuario_id AND d.estado = 'pendiente'
        GROUP BY d.id, d.tipo, d.monto, d.descripcion, d.movimiento_id, p.nombre
    LOOP
        IF v_deuda.movimiento_id IS NOT NULL THEN
            UPDATE movimientos SET monto = GREATEST(monto - (v_deuda.monto - v_deuda.pagado), 0)
            WHERE id = v_deuda.movimiento_id AND usuario_id = p_usuario_id;
        ELSIF (v_deuda.monto - v_deuda.pagado) > 0 THEN
            PERFORM registrar_movimiento_pago_deuda(p_usuario_id, v_deuda.tipo, v_deuda.monto - v_deuda.pagado, v_deuda.descripcion, false, v_deuda.persona_nombre);
        END IF;
    END LOOP;

    UPDATE deudas
    SET estado = 'saldado', saldado_en = CURRENT_TIMESTAMP
    WHERE persona_id = p_persona_id AND usuario_id = p_usuario_id AND estado = 'pendiente';
END;
$$ LANGUAGE plpgsql;

-- Salda puntualmente una o varias entradas de deuda (elegidas por id), sin
-- tocar el resto de las pendientes de la persona. Misma lógica de descuento
-- del movimiento vinculado (o generación de movimiento nuevo) que saldar_persona.
CREATE OR REPLACE FUNCTION saldar_deudas(p_usuario_id INTEGER, p_ids INTEGER[]) RETURNS VOID AS $$
DECLARE
    v_deuda RECORD;
BEGIN
    FOR v_deuda IN
        SELECT d.id, d.tipo, d.monto, d.descripcion, d.movimiento_id, p.nombre AS persona_nombre, COALESCE(SUM(pg.monto), 0) AS pagado
        FROM deudas d
        JOIN personas p ON p.id = d.persona_id
        LEFT JOIN pagos_deuda pg ON pg.deuda_id = d.id
        WHERE d.id = ANY(p_ids) AND d.usuario_id = p_usuario_id AND d.estado = 'pendiente'
        GROUP BY d.id, d.tipo, d.monto, d.descripcion, d.movimiento_id, p.nombre
    LOOP
        IF v_deuda.movimiento_id IS NOT NULL THEN
            UPDATE movimientos SET monto = GREATEST(monto - (v_deuda.monto - v_deuda.pagado), 0)
            WHERE id = v_deuda.movimiento_id AND usuario_id = p_usuario_id;
        ELSIF (v_deuda.monto - v_deuda.pagado) > 0 THEN
            PERFORM registrar_movimiento_pago_deuda(p_usuario_id, v_deuda.tipo, v_deuda.monto - v_deuda.pagado, v_deuda.descripcion, false, v_deuda.persona_nombre);
        END IF;
    END LOOP;

    UPDATE deudas
    SET estado = 'saldado', saldado_en = CURRENT_TIMESTAMP
    WHERE id = ANY(p_ids) AND usuario_id = p_usuario_id AND estado = 'pendiente';
END;
$$ LANGUAGE plpgsql;

-- Edita una entrada de deuda puntual. Sólo se permite mientras sigue
-- pendiente, sin ningún pago parcial registrado y sin venir de un gasto
-- compartido (movimiento_id) — en esos casos ya hay plata que se movió o un
-- movimiento vinculado, y editar monto/tipo ahí podría desincronizar todo.
CREATE OR REPLACE FUNCTION actualizar_deuda(
    p_usuario_id      INTEGER,
    p_id              INTEGER,
    p_persona_nombre  VARCHAR,
    p_tipo            VARCHAR,
    p_monto           NUMERIC,
    p_descripcion     VARCHAR,
    p_fecha           DATE DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_estado        VARCHAR(10);
    v_movimiento_id INTEGER;
    v_tiene_pagos   BOOLEAN;
    v_persona_id    INTEGER;
BEGIN
    SELECT d.estado, d.movimiento_id, EXISTS(SELECT 1 FROM pagos_deuda pg WHERE pg.deuda_id = d.id)
    INTO v_estado, v_movimiento_id, v_tiene_pagos
    FROM deudas d
    WHERE d.id = p_id AND d.usuario_id = p_usuario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La deuda indicada no existe.';
    END IF;
    IF v_estado != 'pendiente' THEN
        RAISE EXCEPTION 'Sólo se puede editar una deuda pendiente.';
    END IF;
    IF v_movimiento_id IS NOT NULL THEN
        RAISE EXCEPTION 'Esta deuda viene de un gasto compartido y no se puede editar acá.';
    END IF;
    IF v_tiene_pagos THEN
        RAISE EXCEPTION 'Esta deuda ya tiene pagos registrados y no se puede editar.';
    END IF;

    v_persona_id := obtener_o_crear_persona(p_usuario_id, p_persona_nombre);

    UPDATE deudas
    SET persona_id  = v_persona_id,
        tipo        = p_tipo,
        monto       = p_monto,
        descripcion = p_descripcion,
        fecha       = COALESCE(p_fecha, fecha)
    WHERE id = p_id AND usuario_id = p_usuario_id;
END;
$$ LANGUAGE plpgsql;

-- Borra una entrada de deuda entera. Si vino de un gasto compartido, lo que
-- todavía estaba pendiente de cobro (monto - ya pagado) pasa a contar como
-- gasto propio en el movimiento que la originó; si ya estaba todo pagado
-- (vía pagar_movimiento) no descuenta de nuevo, porque eso ya se descontó
-- en su momento.
CREATE OR REPLACE FUNCTION eliminar_deuda(p_usuario_id INTEGER, p_id INTEGER) RETURNS VOID AS $$
DECLARE
    v_monto         NUMERIC;
    v_movimiento_id INTEGER;
    v_pagado        NUMERIC;
BEGIN
    SELECT d.monto, d.movimiento_id, COALESCE(SUM(pg.monto), 0)
    INTO v_monto, v_movimiento_id, v_pagado
    FROM deudas d
    LEFT JOIN pagos_deuda pg ON pg.deuda_id = d.id
    WHERE d.id = p_id AND d.usuario_id = p_usuario_id
    GROUP BY d.monto, d.movimiento_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La deuda indicada no existe.';
    END IF;

    IF v_movimiento_id IS NOT NULL THEN
        UPDATE movimientos SET monto = GREATEST(monto - (v_monto - v_pagado), 0)
        WHERE id = v_movimiento_id AND usuario_id = p_usuario_id;
    END IF;

    DELETE FROM deudas WHERE id = p_id AND usuario_id = p_usuario_id;
END;
$$ LANGUAGE plpgsql;

-- Registra el pago de una cuota (parte o el total) de una entrada de deuda
-- puntual. Si la cuota cubre lo que quedaba pendiente, la deuda se marca
-- saldada sola; si no, sigue pendiente con el saldo ya descontado. Si la
-- deuda vino de un gasto compartido (movimiento_id), lo cobrado se descuenta
-- del movimiento — así ese gasto refleja lo que realmente terminás poniendo
-- de tu bolsillo a medida que te van pagando. Si es una deuda standalone (sin
-- movimiento_id), en cambio, se genera un movimiento real nuevo por lo
-- cobrado/pagado (ver registrar_movimiento_pago_deuda) — mutuamente
-- excluyente con el descuento de arriba para no duplicar la plata.
CREATE OR REPLACE FUNCTION pagar_movimiento(p_usuario_id INTEGER, p_deuda_id INTEGER, p_monto NUMERIC) RETURNS VOID AS $$
DECLARE
    v_monto_total   NUMERIC;
    v_estado        VARCHAR(10);
    v_movimiento_id INTEGER;
    v_tipo          VARCHAR(10);
    v_descripcion   VARCHAR(120);
    v_persona_nombre VARCHAR(60);
    v_pagado        NUMERIC;
    v_saldo         NUMERIC;
BEGIN
    IF p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto a pagar debe ser mayor a cero.';
    END IF;

    SELECT d.monto, d.estado, d.movimiento_id, d.tipo, d.descripcion, p.nombre
    INTO v_monto_total, v_estado, v_movimiento_id, v_tipo, v_descripcion, v_persona_nombre
    FROM deudas d JOIN personas p ON p.id = d.persona_id
    WHERE d.id = p_deuda_id AND d.usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El movimiento indicado no existe.';
    END IF;
    IF v_estado = 'saldado' THEN
        RAISE EXCEPTION 'Ese movimiento ya está saldado.';
    END IF;

    SELECT COALESCE(SUM(monto), 0) INTO v_pagado FROM pagos_deuda WHERE deuda_id = p_deuda_id;
    v_saldo := v_monto_total - v_pagado;

    IF p_monto > v_saldo THEN
        RAISE EXCEPTION 'El monto no puede ser mayor al saldo pendiente de ese movimiento.';
    END IF;

    INSERT INTO pagos_deuda (deuda_id, monto) VALUES (p_deuda_id, p_monto);

    IF p_monto = v_saldo THEN
        UPDATE deudas SET estado = 'saldado', saldado_en = CURRENT_TIMESTAMP WHERE id = p_deuda_id;
    END IF;

    IF v_movimiento_id IS NOT NULL THEN
        UPDATE movimientos SET monto = GREATEST(monto - p_monto, 0)
        WHERE id = v_movimiento_id AND usuario_id = p_usuario_id;
    ELSE
        PERFORM registrar_movimiento_pago_deuda(p_usuario_id, v_tipo, p_monto, v_descripcion, p_monto <> v_saldo, v_persona_nombre);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Deshace un pago puntual de cuota; si la deuda se había saldado sola con
-- esa cuota, la reabre. El dueño se valida vía la deuda (pagos_deuda no
-- tiene usuario_id propio). Si la deuda vino de un gasto compartido, le
-- devuelve al movimiento lo que se le había descontado por ese pago.
CREATE OR REPLACE FUNCTION eliminar_pago(p_usuario_id INTEGER, p_pago_id INTEGER) RETURNS VOID AS $$
DECLARE
    v_deuda_id      INTEGER;
    v_monto         NUMERIC;
    v_movimiento_id INTEGER;
BEGIN
    SELECT pg.deuda_id, pg.monto, d.movimiento_id INTO v_deuda_id, v_monto, v_movimiento_id
    FROM pagos_deuda pg
    JOIN deudas d ON d.id = pg.deuda_id
    WHERE pg.id = p_pago_id AND d.usuario_id = p_usuario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pago indicado no existe.';
    END IF;

    DELETE FROM pagos_deuda WHERE id = p_pago_id;

    UPDATE deudas SET estado = 'pendiente', saldado_en = NULL
    WHERE id = v_deuda_id AND estado = 'saldado';

    IF v_movimiento_id IS NOT NULL THEN
        UPDATE movimientos SET monto = monto + v_monto
        WHERE id = v_movimiento_id AND usuario_id = p_usuario_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
