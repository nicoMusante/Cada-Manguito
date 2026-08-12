-- Migración puntual (idempotente): agrega p_registrar_movimiento a crear_deuda.
-- Genera el movimiento espejo cuando la plata de una deuda standalone ya se
-- movió de verdad, para que cobrarla/pagarla después no infle el resumen.
-- Ya está incluida en db/schema.sql, esto es sólo para aplicarla sobre la base real.

-- borro la versión vieja (sin p_registrar_movimiento) porque agregar un
-- parámetro con default no reemplaza la función, crea un overload y las
-- llamadas de 7 argumentos quedan ambiguas.
DROP FUNCTION IF EXISTS crear_deuda(INTEGER, VARCHAR, VARCHAR, NUMERIC, VARCHAR, DATE, INTEGER);

-- p_registrar_movimiento sirve para las deudas standalone donde la plata ya
-- se movió de verdad (le presté efectivo a alguien, o me prestaron a mí): en
-- ese caso genero acá el movimiento espejo, y el movimiento que se genera al
-- saldar (registrar_movimiento_pago_deuda) lo cancela, así el impacto neto en
-- el resumen termina siendo cero. Si la plata todavía no se movió (ej. me
-- invitaron la cena y después devuelvo), se deja en false y sólo se anota el
-- movimiento al saldar. Nunca aplica si la deuda viene de un gasto compartido
-- (p_movimiento_id): ahí el gasto original ya está registrado.
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
        -- si me deben, la plata salió (gasto); si yo debo, la plata entró (ingreso)
        v_tipo_mov := CASE WHEN p_tipo = 'ME_DEBEN' THEN 'GASTO' ELSE 'INGRESO' END;
        v_categoria_id := obtener_o_crear_categoria_pago_deuda(p_usuario_id, v_tipo_mov);

        INSERT INTO movimientos (usuario_id, categoria_id, descripcion, monto, tipo, fecha)
        VALUES (
            p_usuario_id,
            v_categoria_id,
            LEFT(
                CASE WHEN p_tipo = 'ME_DEBEN' THEN 'Préstamo a ' ELSE 'Préstamo de ' END
                || TRIM(p_persona_nombre) || ' (' || p_descripcion || ')',
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
