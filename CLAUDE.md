# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

"Cada Manguito": app de finanzas personales (ingresos, gastos, deudas, saldos). Next.js (App Router, TS) + Tailwind + Postgres en Neon (`lib/db.ts`). Deploy en Vercel.

## Comandos

```
npm run dev      # servidor de desarrollo (localhost:3000)
npm run build    # build de producción
npm run start    # sirve el build de producción
npm run lint     # next lint
```

Node vía nvm en `~/.nvm/versions/node/v24.18.0/bin` — no siempre está en el PATH por defecto de todos los entornos/shells; si `npm`/`node` da "orden no encontrada", agregar esa ruta al PATH antes de reintentar. `node_modules` no viene en el repo: correr `npm install` la primera vez.

No hay suite de tests configurada. Requiere `.env.local` con `DATABASE_URL` apuntando a una base Neon con el esquema de abajo ya creado. No hay migraciones en el repo — el esquema vive directamente en Neon, pero `db/schema.sql` guarda un snapshot consolidado e idempotente (tablas, vistas, funciones, seed) para poder recrearlo o consultarlo sin conectarse a la base. Es un snapshot manual, no se corre automático ni queda sincronizado solo: si se cambia algo en Neon, hay que actualizar ese archivo a mano.

**Conexión a la base — ojo con esto**: el connection string real va únicamente en `.env.local` (gitignoreado, nunca se sube). `.env.local.example` es sólo la plantilla con placeholder y SÍ está versionado en git — nunca pegar ahí un string real (ya pasó una vez: quedó una contraseña real en un archivo trackeado, sin commitear de milagro; hubo que rotarla). Además, cambios en `.env.local` no hacen hot-reload — Next sólo lee las env vars al arrancar, así que después de tocar `DATABASE_URL` hay que matar y volver a levantar `npm run dev`.

`.claude/settings.json` (del proyecto, versionado) ya trae permisos y un hook configurados: allowlist para comandos habituales no destructivos (`npm run/install`, `git status/diff/log/add/commit`, `ls/find/grep/cat/mkdir/mv/cp`, etc.), lista `ask` explícita que sigue pidiendo confirmación para lo irreversible (`rm -rf`, `push --force`, `reset --hard`, `git clean`, `checkout --`/`restore`, `--no-verify`, `--no-gpg-sign`, `branch -D`, cualquier `psql` directo), y un hook `PostToolUse` que después de editar algo en `app/`, `components/` o `lib/` chequea con `pgrep` si ya hay un proceso `next dev` corriendo y si no lo arranca en background (sin bloquear, sin gastar tokens). Usa `pgrep` en vez de pegarle a `localhost:3000` con curl a propósito: un check HTTP justo después de un edit puede coincidir con la recompilación de Next y dar un falso "está caído", duplicando el proceso y corrompiendo `.next/` (ya pasó). Si alguna vez la app se ve sin estilos/con contenido duplicado, es señal de eso: matar todos los `next dev` (`pgrep -f "node_modules/.bin/next dev"`), borrar `.next/` y levantar uno solo.

## Arquitectura

- Toda la lógica de negocio (validaciones, cálculos, inserciones en cascada) vive en funciones PL/pgSQL dentro de Neon, no en el código TS. Las rutas de `app/api/` son finas: parsean el body, llaman a la función o vista correspondiente vía `sql` (tagged template de `lib/db.ts`) y devuelven el resultado. Ver `app/api/movimientos/route.ts` como ejemplo del patrón (GET contra `v_movimientos`, POST vía `insertar_movimiento`, con `crear_deuda` encadenada si el gasto fue compartido).
- `app/page.tsx` es el único componente con estado: carga movimientos/categorías/personas/gastos fijos por `fetch` a las rutas propias, y pasa todo hacia abajo por props a las vistas (`ResumenView`, `MovimientosView`, `PersonasView`, `GastosFijosView`) y modales. No hay store global ni context.
- Las filas que llegan de Postgres (snake_case, `monto` como string, `tipo` en mayúsculas) se mapean a los tipos de UI (camelCase, `monto` con signo, `icon` como componente Lucide) en `lib/mockData.ts` (`mapMovimiento`, `mapCategoria`, `mapGastoFijo`). Los endpoints no devuelven directamente los tipos de UI.
- `lib/icons.ts` mapea el string `icono` guardado en la base a un componente de `lucide-react`.
- Un objeto `Theme` (`lib/theme.ts`, 4 variantes: `light`, `dark`, `yellow`, `navy`, con labels en `THEME_LABELS`) se pasa como prop `t` a cada componente — no se usa Tailwind dark: variant ni CSS vars para el theming, son estilos inline con los valores del objeto. El tema activo se elige desde `ThemeModal`, no hay más un simple toggle claro/oscuro.
- `MobileShell` maneja swipe entre tabs y pull-to-refresh en mobile; en desktop (`lg:`) se muestra sidebar + panel único en vez del carrusel. Ambos layouts renderizan los mismos paneles (`resumenPanel`, `movimientosPanel`, `personasPanel`, `fijosPanel`) construidos una sola vez en `page.tsx`.
- Movimientos y resumen están acotados a un mes (`periodo` `YYYY-MM`, estado en `page.tsx`, helpers en `lib/periodo.ts`). `GET /api/movimientos?periodo=YYYY-MM` filtra por ese mes; `MonthSwitcher` navega entre meses en `ResumenView` y `MovimientosView`. Las deudas de `PersonasView` NO se filtran por mes: persisten hasta que se saldan.
- Gastos fijos/recurrentes (`gastos_fijos`, tab "Fijos") se auto-generan como movimientos reales: cada vez que `GET /api/movimientos` se pide para el mes en curso, dispara primero `generar_gastos_fijos_pendientes()` (idempotente, chequea `movimientos.gasto_fijo_id`), que crea el movimiento de cada gasto fijo activo cuyo `dia_mes` ya llegó y todavía no se generó ese mes. No hay cron: el trigger es ese GET.
- Categorías y personas se resuelven por nombre si no existen (`obtener_o_crear_persona`) — no hay pantalla de alta de personas separada, se crean implícitamente al cargar una deuda.
- "Eliminar" categoría o gasto fijo es baja lógica (`activo = false` vía `eliminar_categoria`/`eliminar_gasto_fijo`), no un DELETE — así los movimientos históricos que ya los referencian no se rompen.
- `lib/mockData.ts` todavía tiene arrays y exports sueltos (`categories`, `personas`, `meDeben`, `yoDebo` a nivel de módulo) de antes de que existieran los endpoints reales — son código muerto, no los uses como fuente de datos. Lo que sí se usa activamente del archivo son los tipos (`Movimiento`, `MovimientoRow`, `CategoriaConId`, `CategoriaRow`, `GastoFijo`, `GastoFijoRow`) y las funciones `mapMovimiento`/`mapCategoria`/`mapGastoFijo`.
- Todas las rutas de `app/api/` exportan `export const dynamic = "force-dynamic"` y los GET devuelven `Cache-Control: no-store, max-age=0` — es intencional para que Vercel/Next no cacheen datos que cambian con cada movimiento o deuda. Mantener esto al agregar rutas nuevas.

## UI: mobile primero, pero siempre los dos

La app está pensada principalmente para usarse en celular, pero corre también en desktop (`lg:` sidebar + panel único, ver bullet de `MobileShell` arriba). Todo cambio de UI de acá en adelante tiene que contemplar ambos layouts: si se toca un componente compartido entre `MobileShell` y el layout desktop, o se agrega algo nuevo, probar (o al menos revisar el JSX) en viewport mobile y en `lg:` antes de dar el cambio por terminado — no alcanza con verificar el que se ve por default.

## Estructura del Proyecto
- `app/api/`: Endpoints REST (`/categorias` [+ `/[id]` DELETE], `/movimientos`, `/personas`, `/deudas` [+ `/saldar`, `/[id]/pagos`], `/pagos/[id]`, `/gastos-fijos` [+ `/[id]`]).
- `components/`:
  - Vistas principales: `ResumenView`, `MovimientosView`, `PersonasView`, `GastosFijosView`.
  - Modales: `MovimientoModal`, `CategoriaModal`, `DeudaModal`, `GastoFijoModal`, `PersonaDetalleModal`, `ThemeModal`.
  - UI / Shell: `MobileShell`, `Header`, `Sidebar`, `BottomNav`, `MovimientoItem`, `MonthSwitcher`.
- `lib/`: `db.ts` (cliente Neon), `mockData.ts`, `theme.ts`, `icons.ts`, `periodo.ts` (helpers de mes: `periodoActual`, `sumarMeses`, `formatPeriodoLabel`).

## Esquema de Base de Datos (Neon PostgreSQL)

### Tablas Principales
- **`categorias`**: `id`, `nombre` (UNIQUE), `tipo` ('INGRESO'/'GASTO'), `color_hex`, `icono`, `activo`.
- **`gastos_fijos`**: `id`, `categoria_id` (FK, tiene que ser tipo GASTO), `descripcion`, `monto` (>0), `dia_mes` (1-28), `activo`, `creado_en`.
- **`movimientos`**: `id`, `categoria_id` (FK), `descripcion`, `monto` (>0), `fecha`, `creado_en`, `gasto_fijo_id` (FK opcional — si no es null, lo generó un gasto fijo).
- **`personas`**: `id`, `nombre` (UNIQUE).
- **`deudas`**: `id`, `persona_id` (FK), `tipo` ('ME_DEBEN'/'YO_DEBO'), `monto` (>0), `descripcion`, `fecha`, `estado` ('pendiente'/'saldado'), `movimiento_id` (FK opcional), `saldado_en`.
- **`pagos_deuda`**: `id`, `deuda_id` (FK), `monto` (>0), `fecha`, `creado_en` — cuotas/pagos parciales de una deuda puntual.

### Vistas
- **`v_movimientos`**: Une `movimientos` y `categorias`. Calcula `monto_con_signo` (negativo si es 'GASTO'), `mes` y `periodo` ('YYYY-MM').
- **`v_personas_activas`**: Agrupa deudas pendientes por persona (saldo ya neto de `pagos_deuda`), calcula saldo neto y trae el `ultimo_detalle`.

### Funciones PL/pgSQL
- **Categorías**: `eliminar_categoria(id)` (baja lógica).
- **Gastos fijos**: `crear_gasto_fijo(...)`, `eliminar_gasto_fijo(id)` (baja lógica), `generar_gastos_fijos_pendientes()` (la llama el GET de movimientos, ver Arquitectura).
- **Movimientos**: `insertar_movimiento(...)`, `actualizar_movimiento(...)`, `eliminar_movimiento(...)`.
- **Reportes**: `resumen_mes(anio, mes)`, `evolucion_mensual(cant_meses)`, `gasto_por_categoria(anio, mes)`.
- **Personas / Deudas**: `obtener_o_crear_persona(nombre)`, `crear_deuda(...)`, `saldar_persona(persona_id)`, `saldar_deudas(ids[])` (salda entradas puntuales), `pagar_movimiento(deuda_id, monto)` (registra una cuota, auto-salda si cubre el saldo), `eliminar_pago(pago_id)` (deshace una cuota, reabre la deuda si hacía falta).

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