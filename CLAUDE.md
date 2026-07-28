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
- `app/page.tsx` es el único componente con estado: carga movimientos/categorías/personas por `fetch` a las rutas propias, y pasa todo hacia abajo por props a las vistas (`ResumenView`, `MovimientosView`, `PersonasView`) y modales. No hay store global ni context.
- Las filas que llegan de Postgres (snake_case, `monto` como string, `tipo` en mayúsculas) se mapean a los tipos de UI (camelCase, `monto` con signo, `icon` como componente Lucide) en `lib/mockData.ts` (`mapMovimiento`, `mapCategoria`). Los endpoints no devuelven directamente los tipos de UI.
- `lib/icons.ts` mapea el string `icono` guardado en la base a un componente de `lucide-react`.
- Un solo objeto `Theme` (`lib/theme.ts`, variantes `light`/`dark`) se pasa como prop `t` a cada componente — no se usa Tailwind dark: variant ni CSS vars para el theming, son estilos inline con los valores del objeto.
- `MobileShell` maneja swipe entre tabs y pull-to-refresh en mobile; en desktop (`lg:`) se muestra sidebar + panel único en vez del carrusel. Ambos layouts renderizan los mismos paneles (`resumenPanel`, `movimientosPanel`, `personasPanel`) construidos una sola vez en `page.tsx`.
- Categorías y personas se resuelven por nombre si no existen (`obtener_o_crear_persona`) — no hay pantalla de alta de personas separada, se crean implícitamente al cargar una deuda.
- `lib/mockData.ts` todavía tiene arrays y exports sueltos (`categories`, `personas`, `meDeben`, `yoDebo` a nivel de módulo) de antes de que existieran los endpoints reales — son código muerto, no los uses como fuente de datos. Lo que sí se usa activamente del archivo son los tipos (`Movimiento`, `MovimientoRow`, `CategoriaConId`, `CategoriaRow`) y las funciones `mapMovimiento`/`mapCategoria`.
- Todas las rutas de `app/api/` exportan `export const dynamic = "force-dynamic"` y los GET devuelven `Cache-Control: no-store, max-age=0` — es intencional para que Vercel/Next no cacheen datos que cambian con cada movimiento o deuda. Mantener esto al agregar rutas nuevas.

## Estructura del Proyecto
- `app/api/`: Endpoints REST (`/categorias`, `/movimientos`, `/personas`, `/deudas`).
- `components/`:
  - Vistas principales: `ResumenView`, `MovimientosView`, `PersonasView`.
  - Modales: `MovimientoModal`, `CategoriaModal`, `DeudaModal`, `PersonaDetalleModal`.
  - UI / Shell: `MobileShell`, `Header`, `Sidebar`, `BottomNav`, `MovimientoItem`.
- `lib/`: `db.ts` (cliente Neon), `mockData.ts`, `theme.ts`, `icons.ts`.

## Esquema de Base de Datos (Neon PostgreSQL)

### Tablas Principales
- **`categorias`**: `id`, `nombre` (UNIQUE), `tipo` ('INGRESO'/'GASTO'), `color_hex`, `icono`, `activo`.
- **`movimientos`**: `id`, `categoria_id` (FK), `descripcion`, `monto` (>0), `fecha`, `creado_en`.
- **`personas`**: `id`, `nombre` (UNIQUE).
- **`deudas`**: `id`, `persona_id` (FK), `tipo` ('ME_DEBEN'/'YO_DEBO'), `monto` (>0), `descripcion`, `fecha`, `estado` ('pendiente'/'saldado'), `movimiento_id` (FK opcional), `saldado_en`.

### Vistas
- **`v_movimientos`**: Une `movimientos` y `categorias`. Calcula `monto_con_signo` (negativo si es 'GASTO'), `mes` y `periodo` ('YYYY-MM').
- **`v_personas_activas`**: Agrupa deudas pendientes por persona, calcula saldo neto y trae el `ultimo_detalle`.

### Funciones PL/pgSQL
- **Movimientos**: `insertar_movimiento(...)`, `actualizar_movimiento(...)`, `eliminar_movimiento(...)`.
- **Reportes**: `resumen_mes(anio, mes)`, `evolucion_mensual(cant_meses)`, `gasto_por_categoria(anio, mes)`.
- **Personas / Deudas**: `obtener_o_crear_persona(nombre)`, `crear_deuda(...)`, `saldar_persona(persona_id)`.

## Protocolo de Interacción y Ahorro de Tokens

1. **Recepción de Contexto en Tramos**:
   - Cuando se envíe contexto en mensajes consecutivos, responder **únicamente "Recibido"** hasta recibir la confirmación: `"LISTO, podés analizar todo"`.
2. **Respuestas Concisas y Directas**:
   - Ir directo al grano. Sin introducciones largas, saludos ni texto de relleno.
   - En caso de corregir o agregar SQL, explicar brevemente la lógica antes de mostrar el bloque final.
   - **No narrar los pasos al hacer un cambio** (qué archivo se abrió, qué se está por editar, etc). Aplicar el cambio directamente y resumir el resultado en 1-2 líneas al final, no antes ni durante.
3. **Optimización de Código en Respuestas**:
   - **No reescribir archivos completos** salvo que sea estrictamente necesario o solicitado.
   - Entregar únicamente las funciones, componentes o bloques modificados (diffs o snippets precisos).
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