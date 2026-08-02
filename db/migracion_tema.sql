--------------------------------------------------------------------------
-- MIGRACIÓN: preferencia de tema por usuario.
-- Agrega la columna que persiste el tema elegido en el selector de UI
-- (ver lib/theme.ts). Usa IF NOT EXISTS, es seguro correrla más de una vez.
--------------------------------------------------------------------------

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tema VARCHAR(20) NOT NULL DEFAULT 'dark';
