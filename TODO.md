# Tareas pendientes

Ver protocolo de uso de este archivo en CLAUDE.md → "Tareas pendientes entre sesiones".

No queda nada pendiente de la ronda anterior — todo lo de abajo se resolvió y aplicó contra Neon en esta sesión.

## Migraciones sin correr en Neon

- [x] `db/migracion_prestamos.sql` — corrida contra Neon.
- [x] `db/migracion_personas_compensadas.sql` — corrida contra Neon.

## Código — hallazgos de la auditoría 2026-08-11 (nivel Alto)

- [x] Gastos fijos con categoría borrada: `eliminar_categoria` ahora también da de baja los gastos fijos que dependían de esa categoría; `generar_gastos_fijos_pendientes` valida `categorias.activo` como resguardo extra; `GET /api/gastos-fijos` filtra `c.activo = true` en el JOIN.
- [x] Movimiento compartido no transaccional: nueva función `crear_deudas_compartidas` (recibe el array completo de personas, una sola llamada/transacción); `POST /api/movimientos` la usa en vez de loopear `crear_deuda` por persona.
- [x] Movimiento en $0 no editable: `PATCH`/`POST /api/movimientos` cambiaron `if (!monto || !tipo)` por `if (monto == null || !tipo)`; `MovimientoModal` permite `monto === 0` sólo en edición.
- [x] `ultimo_detalle` con NULL: `v_personas_activas` usa `COALESCE(d2.descripcion, 'Sin descripción')`.

## Código — nivel Medio

- [x] `GET /api/movimientos` ahora filtra por rango de `fecha` (`rangoDelPeriodo` en `lib/periodo.ts`) en vez de la columna calculada `periodo`; nuevo índice `ix_movimientos_usuario_fecha (usuario_id, fecha)`.
- [x] `PersonaDetalleModal.tsx` usa `max-h-[85dvh]`.
- [x] `POST /api/auth/registro` valida formato de email con regex antes de crear la cuenta.
- [x] `resumen_mes`, `evolucion_mensual`, `gasto_por_categoria` eliminadas de `db/schema.sql` y de Neon (código muerto).

## Código — nivel Menor

- [x] `v_personas_activas` ahora filtra `d.usuario_id = p.usuario_id` explícito en el JOIN.
- [x] `POST /api/deudas` traduce el mensaje de Postgres igual que el resto de las rutas (400 con el mensaje limpio, no 500 genérico).
- [x] `refrescar()` en `PersonaDetalleModal.tsx` tiene `.catch` en el único call site que no estaba dentro de un try/catch (el `onSaved` de `DeudaModal`).
- [x] `GET /api/dolar` saca la resolución de auth del try/catch, así un error de `auth()` no cae en el fallback de cotización cacheada.
- [x] `reciclar_id_usuario` usa `setval(..., 1, false)` cuando no queda ningún usuario, para que el próximo alta sea id 1 y no 2.

## No abordado (montos que superan precisión de Number/NUMERIC)

- [ ] Montos que superan la precisión de `Number`/`NUMERIC(14,2)` rompen en silencio (`lib/formatMonto.ts`, 500 genérico de Postgres) — no se tocó esta sesión, requiere decidir el manejo (¿validar tope en el cliente? ¿mensaje de error dedicado?) antes de tocar código.
