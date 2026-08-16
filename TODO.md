# Tareas pendientes

Ver protocolo de uso de este archivo en CLAUDE.md → "Tareas pendientes entre sesiones".

## Migraciones sin correr en Neon

- [x] `db/migracion_edicion_gastos_fijos.sql` — corrida contra Neon (verificado `actualizar_gasto_fijo` existe y `crear_deuda` quedó con la firma de 8 params).
- [x] `db/migracion_prestamos.sql` — corrida contra Neon.
- [x] `db/migracion_personas_compensadas.sql` — corrida contra Neon.

## Pedido de UI 2026-08-16 (switch USD, descripción movimiento espejo, salto de altura, editar gasto fijo, gráficos)

- [x] Switch ARS/USD en `MovimientoModal` agrandado (antes 9.5px casi invisible, ahora pill más grande con `bg-primary` en el activo).
- [x] Descripción del movimiento espejo de `crear_deuda` generalizada: ya no asume "Préstamo a/de X", ahora es `{descripción} (a/de {persona})` — ver `db/migracion_edicion_gastos_fijos.sql` pendiente de correr arriba.
- [x] Salto de altura entre pestañas con/sin selector de mes: la franja del mes ahora está siempre montada con el mismo alto en las 5 pestañas (`MonthSwitcher`/`SinFiltroMes` en `components/MonthSwitcher.tsx`), sin animación de colapso. `MobileShell` ya no anima `grid-template-rows`.
- [x] Edición de gastos fijos: `actualizar_gasto_fijo` (SQL, sólo categoría/descripción/monto/día — no toca `mes_inicio`/`cuotas_totales`), `PATCH /api/gastos-fijos/[id]`, `GastoFijoModal` acepta prop `gastoFijo` para editar, click en la card de `GastosFijosView` abre el modal en modo edición.
- [x] Pestaña Gráficos: se eligió la opción "Simplificado" de los mockups — se sacó la card de "Ranking de categorías" (redundante con la torta) de `GraficosView.tsx`; quedan sólo "Por categoría" (torta + leyenda) y "Por día".

Probado en un usuario de prueba (`qa-test-*@example.com`) creado contra la base real de Neon vía Playwright headless — capturas de pantalla en mobile (390px) confirmaron los 4 puntos de arriba. Queda esa fila de usuario de prueba en la base (sin borrar, no hay endpoint de borrado de cuenta); es inofensiva pero se puede eliminar a mano si molesta.

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

## Montos que superan precisión de NUMERIC(14,2)

- [x] `MONTO_MAXIMO` (999999999999.99) en `lib/formatMonto.ts`. Validado en los 4 modales que cargan monto (`MovimientoModal`, `DeudaModal`, `PersonaDetalleModal`, `GastoFijoModal`) antes de armar el fetch, con el mismo patrón `setError` que ya usaban. Defensa en profundidad server-side en las 6 rutas mutantes (`movimientos` POST/PATCH, `deudas` POST/PATCH, `deudas/[id]/pagos` POST, `gastos-fijos` POST) devolviendo 400 "El monto es demasiado grande." en vez de dejar que llegue el "numeric field overflow" crudo de Postgres.
