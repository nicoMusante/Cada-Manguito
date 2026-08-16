# Tareas pendientes

Ver protocolo de uso de este archivo en CLAUDE.md → "Tareas pendientes entre sesiones".

## Pedido 2026-08-16 (b)

- [x] **Gráficos con el look del mockup elegido (opción A · Simplificado)**: donut con el total en `$22-26px` centrado, leyenda con filas separadas por `border-b`, y "Por día" pasó de `BarChart` a `AreaChart` con gradiente (`hsl(var(--expense))` con opacidad decreciente vía `<linearGradient>`) en `components/GraficosView.tsx`. Probado con datos reales contra un usuario de prueba en Neon.
- [x] **Saludo dinámico según hora de Argentina**: `saludoActualAr()` en `lib/periodo.ts` (Buenos días 6-12, Buenas tardes 12-19, Buenas noches resto), usado en `components/Header.tsx:54`. Ancla a `America/Argentina/Buenos_Aires` vía `Intl.DateTimeFormat`, no a la hora del dispositivo. Probado: mostró "Buenos días" correctamente en la corrida de prueba.
- [ ] **Bot de WhatsApp para anotar movimientos**: sin empezar. La idea del usuario (2026-08-16): un bot que lea los mensajes de un chat de WhatsApp y anote movimientos en la app a partir de eso — el usuario mandó explícitamente que se "indague" el resto al momento de encarar la tarea, no quedó definido de antemano. Investigar/decidir en esa sesión, en este orden (cada decisión condiciona la siguiente):
  1. **Vínculo cuenta↔número de WhatsApp**: cómo se asocia el número de quien escribe con un `usuarios.id` existente — ¿flag `whatsapp_numero` en `usuarios` que se carga desde `AjustesModal`, con un código de verificación tipo el flujo de recuperación de contraseña? Sin esto no hay forma de saber a qué cuenta pertenece el mensaje.
  2. **Canal técnico**: WhatsApp Business Platform (Meta Cloud API, gratis hasta cierto volumen, requiere Meta Business verificado) vs. un intermediario (Twilio WhatsApp API, más simple de arrancar pero de pago desde el mensaje 1). Definir cuál, y dónde vive el webhook — nueva ruta en `app/api/whatsapp/` recibiendo el POST del proveedor.
  3. **Formato del mensaje**: texto libre en lenguaje natural ("gasté 500 en comida") vs. comando corto fijo (`/gasto 500 comida`). Texto libre es más cómodo pero exige parsearlo.
  4. **Categorización**: si el formato es libre, ¿un LLM (API de Anthropic — ver skill `claude-api`) resuelve tipo/monto/categoría/descripción a partir del texto? Si es comando fijo, alcanza con un parser simple sin costo de LLM ni latencia extra. Ver qué tan tolerante a ambigüedad quiere el usuario (ej. "compré unas zapatillas 45000" sin nombrar la categoría — ¿el bot elige la más parecida entre las categorías del usuario, o pregunta?).
  5. **Confirmación**: ¿el bot responde por WhatsApp confirmando lo que anotó (y da tiempo a corregir/cancelar antes de guardar), o guarda directo y listo? Los otros flujos de la app siempre muestran preview antes de confirmar (ver `MovimientoModal`) — probablemente conviene mantener esa idea acá también.
  6. Encaja con la arquitectura actual (`insertar_movimiento`, `getUsuarioId`) una vez resuelto 1-5 — no debería requerir tocar la lógica de negocio en Postgres, sólo una ruta nueva que llegue a `insertar_movimiento` con los datos ya resueltos.

Probado en 2 usuarios de prueba (`qa-test-*@example.com`) contra Neon vía Playwright headless — quedan esas filas en la base, inofensivas, se pueden borrar a mano.

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
