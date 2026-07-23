# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```
npm run dev      # servidor de desarrollo (localhost:3000)
npm run build    # build de producción
npm run start    # sirve el build de producción
npm run lint     # next lint
```

No hay suite de tests configurada. Requiere `.env.local` con `DATABASE_URL` (ver `.env.local.example`) apuntando a una base Neon con el esquema de abajo ya creado — no hay migraciones en el repo, el esquema vive directamente en Neon.

## Arquitectura

- Toda la lógica de negocio (validaciones, cálculos, inserciones en cascada) vive en funciones PL/pgSQL dentro de Neon, no en el código TS. Las rutas de `app/api/` son finas: parsean el body, llaman a la función o vista correspondiente vía `sql` (tagged template de `lib/db.ts`) y devuelven el resultado. Ver `app/api/movimientos/route.ts` como ejemplo del patrón (GET contra `v_movimientos`, POST vía `insertar_movimiento`, con `crear_deuda` encadenada si el gasto fue compartido).
- `app/page.tsx` es el único componente con estado: carga movimientos/categorías/personas por `fetch` a las rutas propias, y pasa todo hacia abajo por props a las vistas (`ResumenView`, `MovimientosView`, `PersonasView`) y modales. No hay store global ni context.
- Las filas que llegan de Postgres (snake_case, `monto` como string, `tipo` en mayúsculas) se mapean a los tipos de UI (camelCase, `monto` con signo, `icon` como componente Lucide) en `lib/mockData.ts` (`mapMovimiento`, `mapCategoria`). Los endpoints no devuelven directamente los tipos de UI.
- `lib/icons.ts` mapea el string `icono` guardado en la base a un componente de `lucide-react`.
- Un solo objeto `Theme` (`lib/theme.ts`, variantes `light`/`dark`) se pasa como prop `t` a cada componente — no se usa Tailwind dark: variant ni CSS vars para el theming, son estilos inline con los valores del objeto.
- `MobileShell` maneja swipe entre tabs y pull-to-refresh en mobile; en desktop (`lg:`) se muestra sidebar + panel único en vez del carrusel. Ambos layouts renderizan los mismos paneles (`resumenPanel`, `movimientosPanel`, `personasPanel`) construidos una sola vez en `page.tsx`.
- Categorías y personas se resuelven por nombre si no existen (`obtener_o_crear_persona`) — no hay pantalla de alta de personas separada, se crean implícitamente al cargar una deuda.

## Visión General y Stack
- **Proyecto**: "Cada Manguito" (App de finanzas personales, gestión de ingresos, gastos, deudas y saldos).
- **Framework**: Next.js (App Router, TypeScript).
- **Estilos**: Tailwind CSS.
- **Base de Datos**: PostgreSQL en Neon (conexión en `lib/db.ts`).
- **Despliegue**: Vercel.

---

## Estructura del Proyecto
- `app/api/`: Endpoints REST (`/categorias`, `/movimientos`, `/personas`, `/deudas`).
- `components/`:
  - Vistas principales: `ResumenView`, `MovimientosView`, `PersonasView`.
  - Modales: `MovimientoModal`, `CategoriaModal`, `DeudaModal`, `PersonaDetalleModal`.
  - UI / Shell: `MobileShell`, `Header`, `Sidebar`, `BottomNav`, `MovimientoItem`.
- `lib/`: `db.ts` (cliente Neon), `mockData.ts`, `theme.ts`, `icons.ts`.

---

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

---

## Protocolo de Interacción y Ahorro de Tokens

1. **Recepción de Contexto en Tramos**:
   - Cuando se envíe contexto en mensajes consecutivos, responder **únicamente "Recibido"** hasta recibir la confirmación: `"LISTO, podés analizar todo"`.
2. **Respuestas Concisas y Directas**:
   - Ir directo al grano. Sin introducciones largas, saludos ni texto de relleno.
   - En caso de corregir o agregar SQL, explicar brevemente la lógica antes de mostrar el bloque final.
3. **Optimización de Código en Respuestas**:
   - **No reescribir archivos completos** salvo que sea estrictamente necesario o solicitado.
   - Entregar únicamente las funciones, componentes o bloques modificados (diffs o snippets precisos).
4. **Respuestas fuera de programación**:
   - Si la consulta no está relacionada con código o programación, responder únicamente lo solicitado sin forzar soluciones en código.

---

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