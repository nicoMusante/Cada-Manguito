--------------------------------------------------------------------------
-- MIGRACIÓN A MULTI-USUARIO — de un solo uso, NO idempotente.
-- Correr una única vez contra la base de Neon que ya tiene datos (los de
-- Nico) para agregarles usuario_id sin perder nada. Después de correr esto,
-- re-aplicar db/schema.sql para dejar las vistas/funciones en su versión
-- final (esas sí son CREATE OR REPLACE, seguras de re-correr).
--
-- Editar el email/nombre de abajo antes de correr si hace falta.
--------------------------------------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS usuarios (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255),
    nombre         VARCHAR(80)  NOT NULL,
    google_id      VARCHAR(255) UNIQUE,
    creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- cuenta dueña de todos los datos que ya existen hoy en la base
INSERT INTO usuarios (email, nombre) VALUES ('nicomusmusante@gmail.com', 'Nico')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE categorias   ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE movimientos  ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE personas     ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE deudas       ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);

UPDATE categorias   SET usuario_id = (SELECT id FROM usuarios WHERE email = 'nicomusmusante@gmail.com') WHERE usuario_id IS NULL;
UPDATE gastos_fijos SET usuario_id = (SELECT id FROM usuarios WHERE email = 'nicomusmusante@gmail.com') WHERE usuario_id IS NULL;
UPDATE movimientos  SET usuario_id = (SELECT id FROM usuarios WHERE email = 'nicomusmusante@gmail.com') WHERE usuario_id IS NULL;
UPDATE personas     SET usuario_id = (SELECT id FROM usuarios WHERE email = 'nicomusmusante@gmail.com') WHERE usuario_id IS NULL;
UPDATE deudas       SET usuario_id = (SELECT id FROM usuarios WHERE email = 'nicomusmusante@gmail.com') WHERE usuario_id IS NULL;

ALTER TABLE categorias   ALTER COLUMN usuario_id SET NOT NULL;
ALTER TABLE gastos_fijos ALTER COLUMN usuario_id SET NOT NULL;
ALTER TABLE movimientos  ALTER COLUMN usuario_id SET NOT NULL;
ALTER TABLE personas     ALTER COLUMN usuario_id SET NOT NULL;
ALTER TABLE deudas       ALTER COLUMN usuario_id SET NOT NULL;

-- las categorías y personas ahora son únicas por usuario, no globalmente
ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_nombre_key;
ALTER TABLE categorias ADD CONSTRAINT uq_categoria_nombre_usuario UNIQUE (nombre, usuario_id);

ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_nombre_key;
ALTER TABLE personas ADD CONSTRAINT uq_persona_nombre_usuario UNIQUE (nombre, usuario_id);

CREATE INDEX IF NOT EXISTS ix_movimientos_usuario ON movimientos (usuario_id);
CREATE INDEX IF NOT EXISTS ix_deudas_usuario ON deudas (usuario_id);

COMMIT;
