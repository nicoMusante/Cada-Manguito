-- Migración puntual (idempotente): saca el HAVING neto != 0 de v_personas_activas.
-- Si una persona tiene una deuda ME_DEBEN y otra YO_DEBO que se compensan
-- exacto, el neto daba 0 y la persona desaparecía de la pestaña Deudas con
-- las dos entradas todavía "pendiente" en la base — invisibles e insaldables.
-- Ya está incluida en db/schema.sql, esto es sólo para aplicarla sobre la base real.

CREATE OR REPLACE VIEW v_personas_activas AS
SELECT
    p.id AS persona_id,
    p.nombre,
    SUM(CASE WHEN d.tipo = 'ME_DEBEN' THEN (d.monto - COALESCE(pg.pagado, 0)) ELSE -(d.monto - COALESCE(pg.pagado, 0)) END) AS neto,
    (
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
GROUP BY p.id, p.usuario_id, p.nombre;
