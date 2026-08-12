# Tareas pendientes

Ver protocolo de uso de este archivo en CLAUDE.md → "Tareas pendientes entre sesiones".

## Migraciones sin correr en Neon

- [ ] `db/migracion_prestamos.sql` — sin esto, el toggle "la plata ya salió/entró de tu cuenta" de `DeudaModal` no hace nada (la función vieja de `crear_deuda` no acepta el parámetro nuevo).
- [ ] `db/migracion_personas_compensadas.sql` — sin esto, una persona con deudas que se compensan exacto (neto = 0) sigue sin aparecer en la pestaña Deudas ni poder saldarse.

## Código — hallazgos de la auditoría 2026-08-11 (nivel Alto, sin resolver)

- [ ] **Gastos fijos siguen generando movimientos con una categoría borrada.** `eliminar_categoria` (`db/schema.sql`) no toca `gastos_fijos`; `generar_gastos_fijos_pendientes` no valida que la categoría siga activa, y `GET /api/gastos-fijos` hace el JOIN sin filtrar `c.activo = true`.
- [ ] **Crear un movimiento compartido con varias personas no es transaccional.** En `POST /api/movimientos` (app/api/movimientos/route.ts), el `for` que llama `crear_deuda` por cada persona corre en transacciones separadas (driver HTTP de Neon) — si falla a mitad de camino quedan deudas parciales sin el resto. Requiere una función PL/pgSQL que reciba el array completo.
- [ ] **Un movimiento en $0 no se puede editar ni borrar.** `PATCH`/`POST /api/movimientos` rechazan `monto: 0` con `if (!monto || !tipo)`, pero el esquema lo permite a propósito (gasto compartido cobrado por completo). Cambiar a `monto == null`.
- [ ] **Deudas de gasto compartido sin descripción rompen `ultimo_detalle`.** `POST /api/movimientos` pasa `descripcion` cruda a `crear_deuda`; si un movimiento tiene categoría pero no descripción, la concatenación en `v_personas_activas` da NULL entero. Necesita `COALESCE`.

## Código — nivel Medio (sin resolver)

- [ ] `GET /api/movimientos` filtra por `periodo = TO_CHAR(fecha, 'YYYY-MM')`, expresión sin índice — seq scan en cada carga. Cambiar a filtro por rango de fechas + índice `(usuario_id, fecha)`.
- [ ] `PersonaDetalleModal.tsx` usa `max-h-[85vh]` en vez de `85dvh` (único lugar de la app que no sigue la convención de `dvh`, ver CLAUDE.md).
- [ ] `POST /api/auth/registro` no valida formato de email, sólo que no esté vacío.
- [ ] `resumen_mes`, `evolucion_mensual`, `gasto_por_categoria` (db/schema.sql) son código muerto — nada en TS las llama, y si se conectan algún día van a contradecir el cálculo de USD en vivo del cliente (`montoEfectivoArs`).

## Código — nivel Menor (sin resolver)

- [ ] `v_personas_activas` no filtra `d.usuario_id = p.usuario_id` en el JOIN — hoy no hay fuga porque `obtener_o_crear_persona` ya filtra por usuario, pero el aislamiento ahí queda implícito en vez de explícito.
- [ ] Montos que superan la precisión de `Number`/`NUMERIC(14,2)` rompen en silencio (`lib/formatMonto.ts`, 500 genérico de Postgres).
- [ ] `POST /api/deudas` devuelve 500 genérico en vez de traducir el mensaje de Postgres como el resto de las rutas.
- [ ] `refrescar()` en `PersonaDetalleModal.tsx` no tiene `.catch`.
- [ ] `GET /api/dolar` devuelve la cotización cacheada desde el `catch` aunque el error haya sido de autenticación.
- [ ] `reciclar_id_usuario` (trigger) pierde el id 1 si se borran todos los usuarios (`COALESCE(MAX(id), 1)`).
