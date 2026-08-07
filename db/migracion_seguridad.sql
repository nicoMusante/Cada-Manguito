--------------------------------------------------------------------------
-- MIGRACIÓN: rate limiting de login/registro y recuperación de contraseña.
-- intentos_auth: registra cada intento fallido de login/registro para
--   poder bloquear por un rato tras varios seguidos (ver lib/rateLimit.ts).
-- tokens_reset_password: tokens de un solo uso para el flujo de "olvidé
--   mi contraseña" (ver app/api/auth/recuperar y app/api/auth/resetear).
-- Usa IF NOT EXISTS, es seguro correrla más de una vez.
--------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS intentos_auth (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    identificador VARCHAR(255) NOT NULL,
    creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_intentos_auth_identificador ON intentos_auth (identificador, creado_en);

CREATE TABLE IF NOT EXISTS tokens_reset_password (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token       VARCHAR(64)  NOT NULL UNIQUE,
    expira_en   TIMESTAMP    NOT NULL,
    usado       BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tokens_reset_password_token ON tokens_reset_password (token);
