# Guía para agentes — Proxima Parada Tours Web

## Flujo obligatorio: graph-first

Antes de hacer búsquedas amplias, `grep` masivos o leer archivos completos, consulta el grafo de conocimiento generado con Graphify.

### 1. Consulta el grafo

```bash
# Pregunta de arquitectura o flujo
graphify query "¿cómo fluye una reserva desde el checkout hasta la API?" --budget 1500

# Camino entre dos conceptos
graphify path "CheckoutPage" "apiRequest()"

# Explicación de un nodo
graphify explain "StaffTripDetailPage"
```

Artefactos disponibles:

- `graphify-out/graph.html` — grafo interactivo.
- `graphify-out/graph.json` — datos persistentes.
- `graphify-out/GRAPH_REPORT.md` — resumen, comunidades y hallazgos.
- `docs/architecture-graph.md` — reporte versionado con lectura de arquitectura.

### 2. Lee solo lo necesario

- Usa las rutas y números de línea que devuelve el grafo para leer únicamente los archivos relevantes.
- Evita revisar `node_modules/`, `dist/`, `graphify-out/graph.json` completo o archivos no relacionados.
- Para cambios pequeños, confirma el nodo en el grafo y abre solo ese archivo.

### 3. Comprueba frescura

```bash
# Commit con el que se construyó el grafo
node -p 'require("./graphify-out/graph.json").built_at_commit'

# Cambios en src desde entonces
git diff --name-only <commit-del-grafo>..HEAD -- src
```

Si hay cambios en `src/` o el grafo no existe:

```bash
# Actualización incremental (solo AST, sin costo de LLM)
graphify update src

# Si no existe graphify-out/
graphify src
```

Después de cambios importantes en `src/`, actualiza el grafo antes de terminar la tarea.

### 4. Arquitectura en una frase

SPA React en tres capas: **app shell** (`main` → providers → router/guards → shells), **features** (`auth`, `trips`, `bookings`, `staff`, `profile`, etc.) y **shared** (`apiRequest`, tipos, UI, mapas, utilidades). El flujo de datos es:

```text
Página/Componente → hook de TanStack Query → feature/api.ts → apiRequest() → /api → Railway → Supabase
```

Nodos puente principales: `apiRequest()`, `cn()`, `Button()`, `useAuth()`, `useToast()`.

## Comandos del proyecto

```bash
npm run dev      # Vite en desarrollo
npm run build    # typecheck + build
npm run test     # Vitest
```

## Despliegue

- Frontend: Vercel, proyecto `dw-olf-development/travel-agency-web-app`.
- Producción: https://travel-agency-web-app-sepia.vercel.app
- El push a `main` despliega automáticamente.
