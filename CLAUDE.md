# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

"Cada Manguito": app de finanzas personales (ingresos, gastos, deudas, saldos). Next.js (App Router, TS) + Tailwind + Postgres en Neon (`lib/db.ts`), multi-usuario con NextAuth. Deploy en Vercel.

## Comandos

```
npm run dev      # servidor de desarrollo (localhost:3000)
npm run build    # build de producción
npm run start    # sirve el build de producción
npm run lint     # next lint
```

Node vía nvm en `~/.nvm/versions/node/v24.18.0/bin` — no siempre está en el PATH por defecto de todos los entornos/shells; si `npm`/`node` da "orden no encontrada", agregar esa ruta al PATH antes de reintentar. `node_modules` no viene en el repo: correr `npm install` la primera vez.

No hay suite de tests configurada. Requiere `.env.local` con `DATABASE_URL` apuntando a una base Neon con el esquema de abajo ya creado, `AUTH_SECRET` (generar con `npx auth secret`) y, opcionalmente, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` para habilitar login con Google — sin esas dos el login por mail/contraseña sigue funcionando igual (`auth.ts` sólo agrega el provider de Google si están completas). No hay migraciones en el repo — el esquema vive directamente en Neon, pero `db/schema.sql` guarda un snapshot consolidado e idempotente (tablas, vistas, funciones, seed) para poder recrearlo o consultarlo sin conectarse a la base. Es un snapshot manual, no se corre automático ni queda sincronizado solo: si se cambia algo en Neon, hay que actualizar ese archivo a mano. `db/migracion_usuarios.sql` es una migración puntual (no idempotente, de un solo uso) para pasar una base pre-multiusuario al esquema actual — no correrla de nuevo sobre una base ya migrada.

**Vercel (producción)**: las env vars no se heredan de `.env.local`, hay que cargarlas a mano en el dashboard (mínimo `DATABASE_URL` y `AUTH_SECRET`, más los de Google si se usa ese login). Sin `AUTH_SECRET` ahí, login/registro muestran la pantalla genérica de Auth.js "Server error / There is a problem with the server configuration" — fácil de confundir con un bug de código. Cambiar una env var en Vercel requiere redeploy, no se aplica sola.

**Conexión a la base — ojo con esto**: el connection string real va únicamente en `.env.local` (gitignoreado, nunca se sube). `.env.local.example` es sólo la plantilla con placeholder y SÍ está versionado en git — nunca pegar ahí un string real (ya pasó una vez: quedó una contraseña real en un archivo trackeado, sin commitear de milagro; hubo que rotarla). Además, cambios en `.env.local` no hacen hot-reload — Next sólo lee las env vars al arrancar, así que después de tocar `DATABASE_URL` hay que matar y volver a levantar `npm run dev`.

`.claude/settings.json` (del proyecto, versionado) trae permisos y un hook — ver el archivo para el detalle exacto de los comandos. La lista `ask` sigue pidiendo confirmación para lo irreversible (`rm -rf`, `push --force`, `reset --hard`, `git clean`, `checkout --`/`restore`, `--no-verify`, `branch -D`, `psql` directo). El hook `PostToolUse` levanta `next dev` en background después de editar algo en `app/`, `components/` o `lib/`, si todavía no está corriendo. Chequea con `pgrep`, nunca con un curl a `localhost:3000` a propósito: un check HTTP justo después de un edit puede coincidir con la recompilación de Next y dar un falso "está caído", duplicando el proceso y corrompiendo `.next/` (ya pasó). Si la app se ve sin estilos o con contenido duplicado, es señal de eso: matar todos los `next dev` (`pgrep -f "node_modules/.bin/next dev"`), borrar `.next/` y levantar uno solo.

## Arquitectura

- **Multi-usuario**: todas las tablas de datos (menos `pagos_deuda`, que se valida indirectamente vía `deudas.usuario_id`) llevan `usuario_id`. Cada función PL/pgSQL recibe `p_usuario_id` como primer parámetro y filtra por él — no hay row-level security de Postgres, el aislamiento entre usuarios se hace a mano en cada función y en cada vista.
- **Auth con NextAuth v5** (`auth.ts`, `auth.config.ts`, `middleware.ts`): login por email/contraseña (`bcryptjs` contra `usuarios.password_hash`) y, si están las env vars, Google OAuth. `auth.config.ts` es la config "edge-safe" (sin providers ni acceso a la base) que usa `middleware.ts` para decidir si redirige a `/login`; `auth.ts` extiende esa config agregando los providers reales y los callbacks que sí tocan la base (alta automática de usuario + `sembrar_categorias_default` en el primer login con Google, resolución del `usuarioId` interno guardado en el JWT). El middleware excluye `/api` de su matcher a propósito: un `fetch` no puede seguir un redirect a una página HTML como si fuera la respuesta esperada, así que cada ruta de `app/api/` valida su propia sesión con `getUsuarioId()`/`noAutenticado()` (`lib/auth.ts`) y devuelve 401 en vez de depender del middleware.
- Toda la lógica de negocio (validaciones, cálculos, inserciones en cascada) vive en funciones PL/pgSQL dentro de Neon, no en el código TS. Las rutas de `app/api/` son finas: resuelven `usuarioId` con `getUsuarioId()`, parsean el body, llaman a la función o vista correspondiente vía `sql` (tagged template de `lib/db.ts`) pasando siempre `usuarioId` como filtro/parámetro, y devuelven el resultado. Ver `app/api/movimientos/route.ts` como ejemplo del patrón (GET contra `v_movimientos`, POST vía `insertar_movimiento`, con `crear_deuda` encadenada si el gasto fue compartido).
- `app/page.tsx` es un server component: resuelve la sesión con `auth()`, redirige a `/login` si no hay usuario, y si hay lo pasa como prop a `components/Home.tsx`. `Home` es el único componente con estado real de la app: carga movimientos/categorías/personas/gastos fijos por `fetch` a las rutas propias (siempre con `cache: "no-store"`, la sesión viaja en la cookie) y pasa todo hacia abajo por props a las vistas (`ResumenView`, `MovimientosView`, `GraficosView`, `PersonasView`, `GastosFijosView`) y modales. No hay store global ni context. `app/login/page.tsx` y `app/registro/page.tsx` son las páginas públicas fuera de ese árbol.
- Las filas que llegan de Postgres (snake_case, `monto` como string, `tipo` en mayúsculas) se mapean a los tipos de UI (camelCase, `monto` con signo, `icon` como componente Lucide) en `lib/mockData.ts` (`mapMovimiento`, `mapCategoria`, `mapGastoFijo`). Los endpoints no devuelven directamente los tipos de UI.
- `lib/icons.ts` mapea el string `icono` guardado en la base a un componente de `lucide-react`.
- Theming vía CSS custom properties: `app/globals.css` define un bloque `[data-theme="..."]` por variante (16 en total, 8 pares claro/oscuro — `light`/`dark`, `yellow`/`tabaco`, `navy`/`celeste`, `medianoche`/`glaciar`, `bosque`/`menta`, `violeta`/`lavanda`, `ambar`/`champan`, `vino`/`rosado`; nombres, labels y pares en `lib/theme.ts`) con las mismas variables semánticas (`--background`, `--foreground`, `--card`, `--primary`, `--income`, `--expense`, etc.), y los componentes las consumen por clases Tailwind normales (`bg-background`, `text-foreground`, `bg-secondary`...) — no hay prop `t` ni estilos inline. `Home` aplica el tema activo pisando `document.documentElement.dataset.theme`; la gama de color se elige desde `AjustesModal` y el par claro/oscuro se cambia aparte con el botón sol/luna del `Header` (`THEME_PAIR`), sin tocar la gama.
- Cotización de dólar: `usuarios.tipo_dolar` guarda la preferencia (`DolarTipo` en `lib/dolar.ts`, elegible desde `AjustesModal`); `GET /api/dolar?tipo=...` la trae en vivo de `dolarapi.com` (sin API key) y `Home` la refresca al entrar, cada 5 min y al cambiar el tipo. Los movimientos se pueden cargar en USD (`MovimientoModal`, toggle ARS/USD junto al monto): `monto` en `movimientos` queda siempre en ARS (congelado al momento de cargar, es lo que suman `resumen_mes`/`evolucion_mensual`/etc.), `moneda`/`monto_original` guardan lo tipeado en USD tal cual para mostrarlo. A diferencia de eso, el equivalente en pesos que se muestra en la UI para un movimiento en USD se recalcula en vivo con la cotización vigente (`montoEfectivoArs` en `lib/mockData.ts`), no queda fijo como en los movimientos cargados en ARS.
- `MobileShell` maneja swipe entre tabs y pull-to-refresh en mobile; en desktop (`lg:`) se muestra sidebar + panel único en vez del carrusel. Ambos layouts renderizan los mismos paneles (`resumenPanel`, `movimientosPanel`, `graficosPanel`, `personasPanel`, `fijosPanel`) construidos una sola vez en `Home`. En mobile, los 5 paneles quedan siempre montados dentro del carrusel (cada uno en su propio `overflow-y-auto`, nunca el body) y sólo se trasladan con `transform: translateX` al cambiar de tab — así cada pestaña conserva su propio scroll al volver a ella, sin lógica extra de guardar/restaurar posición. No usar `min-h-screen`/altura de contenido para el alto del carrusel: es `100dvh` fijo vía flexbox: cambiarlo reintroduce la animación de "salto" de altura al swipear que se sacó a propósito.
- Selección de texto deshabilitada globalmente (`user-select: none` en `body`, `app/globals.css`) para que no aparezca el resaltado azul al mantener presionado en mobile; sólo `input`, `textarea` y `[contenteditable]` la tienen habilitada de nuevo. Si se agrega texto que el usuario debería poder copiar (ej. un monto), hay que habilitarla puntualmente ahí.
- Movimientos y resumen están acotados a un mes (`periodo` `YYYY-MM`, estado en `Home`, helpers en `lib/periodo.ts`). `GET /api/movimientos?periodo=YYYY-MM` filtra por ese mes; `MonthSwitcher` navega entre meses en `ResumenView`, `MovimientosView` y `GraficosView`. Las deudas de `PersonasView` NO se filtran por mes: persisten hasta que se saldan.
- Gastos fijos/recurrentes (`gastos_fijos`, tab "Fijos") se auto-generan como movimientos reales: cada vez que `GET /api/movimientos` se pide para el mes en curso, dispara primero `generar_gastos_fijos_pendientes()` (idempotente, chequea `movimientos.gasto_fijo_id`), que crea el movimiento de cada gasto fijo activo cuyo `dia_mes` ya llegó, el período actual cae dentro de `[mes_inicio, mes_fin]` (`mes_fin` null = sin límite) y todavía no se generó ese mes. No hay cron: el trigger es ese GET. Al crear un gasto fijo se elige si arranca este mes o el que viene (`mes_inicio`) y, opcionalmente, una cantidad de cuotas (`cuotas_totales`, que fija `mes_fin` = `mes_inicio` + cuotas - 1); ambos se resuelven en `crear_gasto_fijo` a partir de `hoy_ar()`, no en el cliente.
- **Fechas ancladas a Argentina, nunca `CURRENT_DATE` a secas**: Neon corre en GMT, y un `ALTER DATABASE ... SET timezone` no sirve para corregirlo — el driver HTTP (`@neondatabase/serverless`) abre una sesión nueva por cada query y no hereda ese default (probado a mano). Por eso `db/schema.sql` define `hoy_ar()` (`(NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`) y la usa en vez de `CURRENT_DATE` en todos los defaults de `fecha`/`mes_inicio` y en `insertar_movimiento`, `crear_deuda`, `crear_gasto_fijo`, `generar_gastos_fijos_pendientes` y `evolucion_mensual` — si se agrega una función nueva que necesite "hoy", usar `hoy_ar()`, no `CURRENT_DATE`. Del lado del cliente, las columnas `DATE` (`"YYYY-MM-DD"`) nunca se parsean con `new Date(fechaISO)` directo — eso lo interpreta como medianoche UTC y en Argentina (UTC-3) se muestra un día antes. Usar `parseFechaLocal` (`lib/periodo.ts`) para construir el `Date` a partir de los componentes Y/M/D antes de formatear.
- Personas se resuelven por nombre si no existen (`obtener_o_crear_persona`) — no hay pantalla de alta de personas separada, se crean implícitamente al cargar una deuda. Categorías sí tienen alta explícita (`CategoriaModal` → `crear_categoria`), no se resuelven solas por nombre.
- "Eliminar" categoría o gasto fijo es baja lógica (`activo = false` vía `eliminar_categoria`/`eliminar_gasto_fijo`), no un DELETE. A diferencia de gasto fijo (que no toca lo ya generado), eliminar una categoría además deja sin categoría (`categoria_id = NULL`) a los movimientos que ya la usaban, en vez de seguir mostrando el nombre viejo. `crear_categoria` reactiva una categoría inactiva si se recrea con el mismo nombre (el nombre queda "tomado" por la unique constraint aunque esté inactiva), pero no reengancha esos movimientos viejos — quedan sin categoría para siempre.
- Un movimiento siempre necesita `monto` y al menos uno de `categoria_id`/`descripcion` (constraint `chk_movimiento_cat_o_desc`, validado también en `insertar_movimiento`/`actualizar_movimiento`); `tipo` (INGRESO/GASTO) es un campo propio del movimiento — ya no se infiere de la categoría vía JOIN — justamente para poder existir sin categoría. En la UI, "Sin categoría"/"Sin descripción" se muestran en itálica (`MovimientoItem`) para no confundirse con datos reales. El chip de filtro por categoría (`CategoriaChipBar`, compartido entre `ResumenView`, `MovimientosView` y el panel de filtros de `GraficosView`) admite filtrar también por "sin categoría".
- Saldar o pagar (total o parcial) una deuda standalone (sin `movimiento_id`, ver tabla `deudas`) genera un movimiento real de ingreso/gasto (`registrar_movimiento_pago_deuda`, categoría fija `Cobros`/`Deudas`); las deudas que sí vienen de un gasto compartido (`movimiento_id` no nulo) en cambio descuentan directamente del movimiento original, para no duplicar la plata (`pagar_movimiento`/`saldar_deudas`/`saldar_persona`). Una deuda standalone también se puede editar (`actualizar_deuda`) mientras siga `pendiente`, sin pagos parciales y sin `movimiento_id`.
- `lib/mockData.ts` todavía tiene arrays y exports sueltos (`categories`, `personas`, `meDeben`, `yoDebo` a nivel de módulo) de antes de que existieran los endpoints reales — son código muerto, no los uses como fuente de datos. Lo que sí se usa activamente del archivo son los tipos (`Movimiento`, `MovimientoRow`, `CategoriaConId`, `CategoriaRow`, `GastoFijo`, `GastoFijoRow`) y las funciones `mapMovimiento`/`mapCategoria`/`mapGastoFijo`.
- Todas las rutas de `app/api/` exportan `export const dynamic = "force-dynamic"` y los GET devuelven `Cache-Control: no-store, max-age=0` — es intencional para que Vercel/Next no cacheen datos que cambian con cada movimiento o deuda. Mantener esto al agregar rutas nuevas.

## UI: mobile primero, pero siempre los dos

La app está pensada principalmente para usarse en celular, pero corre también en desktop (`lg:` sidebar + panel único, ver bullet de `MobileShell` arriba). Todo cambio de UI de acá en adelante tiene que contemplar ambos layouts: si se toca un componente compartido entre `MobileShell` y el layout desktop, o se agrega algo nuevo, probar (o al menos revisar el JSX) en viewport mobile y en `lg:` antes de dar el cambio por terminado — no alcanza con verificar el que se ve por default.

## PWA (instalación en el celular)

- `app/manifest.ts` genera `/manifest.webmanifest`; `public/sw.js` es un service worker mínimo sin cache propio, que sólo existe porque Chrome/Android exige uno con fetch handler para considerar la app instalable de verdad (si no, "Instalar" crea sólo un acceso directo que abre el navegador en vez de la app standalone). Intercepta únicamente GET — nunca POST, porque re-emitir el POST del login desde el service worker rompía el body del request en Android — y no cachea nada, así cada apertura trae la última versión deployada sin que haga falta reinstalar. Se registra desde `components/RegistrarServiceWorker.tsx` en `app/layout.tsx`.
- `middleware.ts` excluye del auth-redirect a `manifest.webmanifest`, `sw.js` e `icon-192.png`/`icon-512.png` — Chrome los pide sin sesión para evaluar instalabilidad; si el middleware los redirige a `/login`, la instalación se degrada en silencio a un simple acceso directo.
- iOS no necesita código aparte: `appleWebApp.capable` + `apple-touch-icon`, ya en `app/layout.tsx`, alcanzan. Se instala manualmente desde Safari (no anda igual desde Chrome iOS) con Compartir → Agregar a inicio.

## Estructura del Proyecto
- `app/api/`: Endpoints REST (`/categorias` [+ `/[id]` DELETE], `/movimientos` [+ `/[id]`], `/personas` [+ `/[id]`], `/deudas` [+ `/[id]` PATCH/DELETE, `/saldar`, `/[id]/pagos`], `/pagos/[id]`, `/gastos-fijos` [+ `/[id]`], `/dolar` [cotización], `/usuario` [PATCH `tema`/`tipo_dolar`]). Todas requieren sesión (`getUsuarioId`).
- `app/login/`, `app/registro/`: páginas públicas de autenticación, fuera del árbol de `Home`.
- `app/manifest.ts`, `public/sw.js`: manifest y service worker de la PWA (ver sección arriba).
- `components/`:
  - `Home`: componente cliente raíz, dueño de todo el estado (ver Arquitectura).
  - Vistas principales: `ResumenView`, `MovimientosView`, `GraficosView`, `PersonasView`, `GastosFijosView`.
  - Modales: `MovimientoModal`, `CategoriaModal`, `DeudaModal`, `GastoFijoModal`, `PersonaDetalleModal`, `AjustesModal` (tema + tipo de dólar).
  - UI / Shell: `MobileShell`, `Header`, `Sidebar`, `BottomNav`, `MovimientoItem`, `CategoriaSelector`, `CategoriaChipBar`, `MonthSwitcher`, `RegistrarServiceWorker`.
- `lib/`: `db.ts` (cliente Neon), `auth.ts` (`getUsuarioId`/`noAutenticado`, usado por las rutas de `app/api/`), `mockData.ts`, `theme.ts`, `dolar.ts` (`DolarTipo`, `formatUSD`), `formatMonto.ts` (formato de miles en inputs de monto), `icons.ts`, `periodo.ts` (helpers de mes: `periodoActual`, `sumarMeses`, `formatPeriodoLabel`).
- `auth.ts`, `auth.config.ts`, `middleware.ts`: configuración de NextAuth (raíz del repo, no en `lib/`).

## Esquema de Base de Datos (Neon PostgreSQL)

### Tablas Principales
- **`usuarios`**: `id`, `email` (UNIQUE), `password_hash` (null si sólo usa Google), `nombre`, `google_id` (UNIQUE), `tema` (preferencia de UI, ver `lib/theme.ts`), `tipo_dolar` (preferencia de cotización, ver `lib/dolar.ts`), `creado_en`.
- **`categorias`**: `id`, `usuario_id` (FK), `nombre` (UNIQUE por usuario), `tipo` ('INGRESO'/'GASTO'), `color_hex`, `icono`, `activo`.
- **`gastos_fijos`**: `id`, `usuario_id` (FK), `categoria_id` (FK, tiene que ser tipo GASTO), `descripcion`, `monto` (>0), `dia_mes` (1-28), `mes_inicio` (`YYYY-MM`, desde cuándo genera), `cuotas_totales` (nullable, null = sin límite), `mes_fin` (`YYYY-MM` nullable, calculado a partir de `mes_inicio` + `cuotas_totales`), `activo`, `creado_en`.
- **`movimientos`**: `id`, `usuario_id` (FK), `categoria_id` (FK, nullable), `descripcion` (nullable — al menos uno de los dos es obligatorio, ver Arquitectura), `tipo` ('INGRESO'/'GASTO', propio del movimiento), `monto` (>=0, puede quedar en 0 si un gasto compartido se cobró completo), `moneda` ('ARS'/'USD'), `monto_original` (nullable, lo tipeado si `moneda='USD'`), `fecha`, `creado_en`, `gasto_fijo_id` (FK opcional — si no es null, lo generó un gasto fijo).
- **`personas`**: `id`, `usuario_id` (FK), `nombre` (UNIQUE por usuario).
- **`deudas`**: `id`, `usuario_id` (FK), `persona_id` (FK), `tipo` ('ME_DEBEN'/'YO_DEBO'), `monto` (>0, original, nunca se edita), `descripcion`, `fecha`, `estado` ('pendiente'/'saldado'), `movimiento_id` (FK opcional), `saldado_en`.
- **`pagos_deuda`**: `id`, `deuda_id` (FK, `ON DELETE CASCADE`), `monto` (>0), `fecha`, `creado_en` — cuotas/pagos parciales de una deuda puntual. Sin `usuario_id` propio: el dueño se valida siempre a través de `deudas.usuario_id`.

### Vistas
- **`v_movimientos`**: `LEFT JOIN` de `movimientos` con `categorias` (así los movimientos sin categoría siguen apareciendo, con `categoria`/`color_hex`/`icono` en null). Calcula `monto_con_signo` (negativo si `tipo='GASTO'`), `mes` y `periodo` ('YYYY-MM').
- **`v_personas_activas`**: Agrupa deudas pendientes por persona (saldo ya neto de `pagos_deuda`), calcula saldo neto y trae el `ultimo_detalle`.

### Funciones PL/pgSQL
Todas reciben `p_usuario_id` como primer parámetro (salvo `sembrar_categorias_default`, que sólo opera sobre `categorias` de un usuario recién creado).
- **Usuarios**: `sembrar_categorias_default(usuario_id)` — clona las categorías default al registrarse o en el primer login con Google.
- **Categorías**: `crear_categoria(usuario_id, nombre, tipo, color_hex, icono)` (reactiva la categoría si el nombre pertenece a una inactiva), `eliminar_categoria(usuario_id, id)` (baja lógica + deja sin categoría a los movimientos que la usaban).
- **Gastos fijos**: `crear_gasto_fijo(usuario_id, ...)`, `eliminar_gasto_fijo(usuario_id, id)` (baja lógica), `generar_gastos_fijos_pendientes(usuario_id)` (la llama el GET de movimientos, ver Arquitectura).
- **Movimientos**: `insertar_movimiento(usuario_id, categoria_id, descripcion, monto, tipo, fecha, moneda, monto_original)`, `actualizar_movimiento(usuario_id, id, ...)` (mismos params), `eliminar_movimiento(usuario_id, id)`.
- **Reportes**: `resumen_mes(usuario_id, anio, mes)`, `evolucion_mensual(usuario_id, cant_meses)`, `gasto_por_categoria(usuario_id, anio, mes)`.
- **Personas / Deudas**: `obtener_o_crear_persona(usuario_id, nombre)`, `crear_deuda(usuario_id, ..., fecha)`, `actualizar_deuda(usuario_id, id, ...)` (sólo si sigue pendiente, sin pagos y sin `movimiento_id`), `eliminar_deuda(usuario_id, id)`, `saldar_persona(usuario_id, persona_id)`, `saldar_deudas(usuario_id, ids[])` (salda entradas puntuales), `pagar_movimiento(usuario_id, deuda_id, monto)` (registra una cuota, auto-salda si cubre el saldo), `eliminar_pago(usuario_id, pago_id)` (deshace una cuota, reabre la deuda si hacía falta), `obtener_o_crear_categoria_pago_deuda`/`registrar_movimiento_pago_deuda` (generan el movimiento real al cobrar/pagar una deuda standalone).

## Protocolo de Interacción y Ahorro de Tokens

1. **Recepción de Contexto en Tramos**:
   - Cuando se envíe contexto en mensajes consecutivos, responder **únicamente "Recibido"** hasta recibir la confirmación: `"LISTO, podés analizar todo"`.
2. **Respuestas Concisas y Directas**:
   - Ir directo al grano. Sin introducciones largas, saludos ni texto de relleno.
   - En caso de corregir o agregar SQL, explicar brevemente la lógica antes de mostrar el bloque final.
   - **No narrar los pasos al hacer un cambio** (qué archivo se abrió, qué se está por editar, etc). Aplicar el cambio directamente y resumir el resultado en 1-2 líneas al final, no antes ni durante.
   - No repetir lo que dijo el usuario ni explicar lo obvio.
3. **Optimización de Código en Respuestas**:
   - **No reescribir archivos completos** salvo que sea estrictamente necesario o solicitado (usar Edit para reemplazos parciales; Write sólo si el cambio supera ~80% del archivo).
   - Entregar únicamente las funciones, componentes o bloques modificados (diffs o snippets precisos).
   - No repetir en el texto de la respuesta código que ya se editó o creó — el diff ya lo muestra.
4. **Respuestas fuera de programación**:
   - Si la consulta no está relacionada con código o programación, responder únicamente lo solicitado sin forzar soluciones en código.

## Reglas de Código y Formato de Comentarios

1. **Estilo de Comentarios (ESTRICTO)**:
   - **Siempre en primera persona**: Hablar desde el rol del programador escribiendo su propio código (ej: `//conecto a la base`, `//valido que exista la categoria`).
   - **Sin referencias al usuario**: Nunca usar expresiones en segunda persona ("tu código", "acá hacés", "como pediste").
   - **En minúsculas y lenguaje cotidiano**: Escribir comentarios simples y directos, como anotaciones rápidas al programar.
   - **Sin espacio inicial**: Quitar el primer espacio luego de las barras o numerales (`//comentario` en lugar de `// comentario`).
2. **Tono y Lenguaje**:
   - Español natural de Argentina.
   - Sin modismos ni giros de España (evitar "vosotros", "vale", "joder", etc.).
   - Sin abusar de jerga local extrema ni modismos informales en el texto explicativo.

## Reglas para Ahorrar Tokens

1. **No programar sin contexto**: antes de escribir código, leer los archivos relevantes, revisar git log, entender la arquitectura. Si falta contexto, preguntar en vez de asumir.
2. **No releer archivos ya leídos** en la conversación, salvo que hayan cambiado.
3. **Validar antes de declarar hecho**: compilar, correr tests o verificar que funciona. Nunca decir "listo" sin evidencia.
4. **Cero charla aduladora** ("Excelente pregunta", "Gran idea", "Perfecto"). Directo al trabajo.
5. **Soluciones simples**: lo mínimo que resuelve el problema, sin abstracciones, helpers, tipos ni validaciones no pedidas. 3 líneas repetidas es mejor que una abstracción prematura.
6. **No pelear con el usuario**: si pide algo puntual, hacerlo así. Si hay un concern real (seguridad, pérdida de datos), mencionarlo en 1 oración y proceder.
7. **Leer solo lo necesario**: usar offset/limit en vez de leer archivos enteros. Si se sabe la ruta exacta, Read directo en vez de Glob + Grep + Read.
8. **Paralelizar tool calls**: leer archivos independientes en un solo mensaje, no uno por uno.
9. **No usar Agent cuando Grep/Read basta**: reservarlo para búsquedas amplias o tareas complejas, no para buscar una función o archivo puntual.