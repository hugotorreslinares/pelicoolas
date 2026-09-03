# Design

Referencia técnica del estado actual de Filmo. Para la visión de producto y alcance del MVP ver el PRD original (no versionado en el repo).

## Filosofía de producto

Filmo responde una sola pregunta: _¿he visto todas las películas de esta persona?_ No compite con Letterboxd (ratings/reviews/social) — el núcleo es el checklist de una filmografía.

## Astro vs React

- **Astro**: routing, layouts, SSR, fetch a TMDB (server-side, la API key nunca llega al cliente).
- **React** (`client:load` o `client:idle`): solo componentes interactivos — `PersonSearch`, `Filmography`, `FollowButton`, `UserMenu`, `Dashboard`, `FollowedPeopleHero`, `WatchlistPage`, `MovieDetailsDialog`, `PersonPhotoGallery`, `ThemeToggle`. `UserMenu`/`ThemeToggle` van con `client:idle` — son chrome de navegación, no contenido crítico de la página.
- `PersonInfo.astro` es estático (no necesita hidratación, solo texto derivado de props del servidor).

## Rutas

| Ruta                                                                                   | Descripción                                                |
| :------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| `/`                                                                                    | Home — dashboard si hay sesión, CTA de búsqueda si no      |
| `/search`                                                                              | Buscar persona (TMDB), búsquedas recientes (localStorage)  |
| `/person/[id]`                                                                         | Perfil: foto (→ galería modal), Personal Info, filmografía |
| `/filmographies`                                                                       | "My Filmographies" — personas seguidas + progreso          |
| `/watchlist`                                                                           | Películas guardadas, con referencia a la persona origen    |
| `/api/search-person`, `/api/person/[id]`, `/api/person/[id]/images`, `/api/movie/[id]` | Proxy server-side a TMDB                                   |

## Modelo de datos (Firestore)

```
users/{userId}
  displayName, email, photoURL

users/{userId}/followedPeople/{personId}
  tmdbId, name, profilePath, knownForDepartment, createdAt

users/{userId}/followedPeople/{personId}/watchedMovies/{movieId}
  tmdbId, watchedAt

users/{userId}/watchlist/{movieId}
  tmdbId, title, posterPath, releaseYear, sourcePersonId, sourcePersonName, addedAt
```

Reglas de seguridad: `request.auth.uid == userId` en cada nivel — ver [firestore.rules](firestore.rules). **Cambios a este archivo requieren deploy manual** (Firebase Console o `firebase deploy --only firestore:rules`); no se aplican solos al hacer push.

## Filmografía (TMDB)

- Fuente: `person/{id}/combined_credits`.
- Actores → créditos de `cast`; directores → créditos de `crew` con `department === "Directing"`.
- Deduplicado por `tmdbMovieId`.
- Orden por año (toggle reciente/antiguo); películas sin fecha van al final, nunca se inventa el año.
- Validación en runtime con Zod: `src/types/tmdb.ts` define un schema por respuesta cruda de TMDB (snake_case), y el tipo se infiere del schema (`z.infer`) en vez de mantener una interface duplicada a mano. `tmdbFetch(path, schema, params?)` hace `schema.safeParse()` sobre el JSON y lanza `TmdbError` si no matchea — así un cambio de shape en la API externa falla ruidosamente en el momento del fetch en vez de propagar `undefined` silenciosamente hasta la UI.

## UI

- shadcn/ui: solo los componentes usados (button, input, card, checkbox, avatar, badge, dropdown-menu, skeleton, separator, dialog, progress) — no el catálogo completo.
- Mobile-first, minimalista — evitar que se sienta como IMDb/catálogo de componentes.
- Modales (`Dialog` de base-ui): cierre con click fuera, Escape, o botón X de 44px (mobile-friendly).
- Estado: `useState`/`useEffect` + listeners de Firestore (`onSnapshot`). Sin Redux/Zustand — el estado es pequeño.

## Deploy (Vercel) — gotchas

El build de Vercel usa pnpm con dos políticas que rompen `pnpm install` si no están configuradas en `pnpm-workspace.yaml`:

- `minimumReleaseAge: 0` — su pnpm bloquea paquetes publicados muy recientemente.
- `allowBuilds` — debe listar explícitamente cada paquete con postinstall script (`esbuild`, `sharp`, `@firebase/util`, `protobufjs`), si no el install falla duro (no es solo warning como en local).

Variables de entorno en Vercel (Production + Preview + Development): `TMDB_API_KEY` (Secret), `PUBLIC_FIREBASE_*` (Config — son públicas por diseño, Vercel exige `--type config` explícito para no confundirlas con secretos).

## Calidad de código

- **ESLint** (flat config, `eslint.config.mjs`) + **Prettier** (`.prettierrc.json`, con `prettier-plugin-astro`). Comandos: `pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check`.
- **`eslint-plugin-react-hooks` v7** trae por defecto las reglas experimentales del React Compiler (`set-state-in-effect`, `immutability`, `purity`, ...), que marcan como error el patrón idiomático de sincronizar estado con un listener externo (`useEffect` + `onSnapshot` de Firestore, o `fetch` on mount). Se decidió usar solo las reglas clásicas y estables: `rules-of-hooks` (error) y `exhaustive-deps` (warn). Ver comentario en `eslint.config.mjs`.
- `jsx-a11y/anchor-has-content` está desactivada: el patrón `<Button render={<a href="..." />}>texto</Button>` de base-ui inyecta el contenido en tiempo de ejecución, invisible para el análisis estático — falso positivo garantizado en cada uso.
- `no-undef` desactivado en archivos TS/Astro: `astro check` (TypeScript) ya detecta identificadores no definidos con más precisión, y `no-undef` da falsos positivos con globals ambient (`declare const __BUILD_TIME__`) y tipos de TS.
- **Husky + lint-staged**: pre-commit corre `eslint --fix` + `prettier --write` solo sobre archivos staged (rápido). El typecheck completo (`astro check`) queda para CI, no para el hook — es más lento y no vale la pena en cada commit local.
- **GitHub Actions** (`.github/workflows/ci.yml`): job `ci` en cada push/PR a `main` corre `format:check` → `lint` → `astro check` → `test` (Vitest) → `build`. No necesita secrets: con `output: "server"` ninguna página se prerenderiza en build (todas tienen `prerender = false`), así que no hay fetch a TMDB ni init de Firebase durante `pnpm build`.
- **Vitest** (`vitest.config.ts`, vía `getViteConfig` de `astro/config` — respeta el alias `@/` y el env de Astro sin duplicarlo): unit tests de lógica pura (`src/**/*.test.ts`) — `calculateAge`, `sortFilmography`/`dedupeByMovieId`/`toReleaseYear`, `toGender`, `recentSearches.ts`. `environment: "jsdom"` porque `recentSearches.ts` toca `localStorage`.
- **Firestore rules tests** (`tests/firestore.rules.test.ts`, `@firebase/rules-unit-testing` contra el Firestore Emulator): archivo separado, config separada (`vitest.rules.config.ts`, `environment: "node"`, sin `getViteConfig` — no necesita nada de Astro) y job de CI separado (`firestore-rules`) porque necesita una JVM que el job `ci` no tiene ni necesita para el resto. `pnpm test:rules` levanta el emulador vía `firebase emulators:exec` (config en `firebase.json`), corre los tests, y lo apaga — nunca toca el proyecto Firebase real. Cubre: aislamiento por `uid` en `users/{userId}` y sus subcolecciones (`followedPeople`, `watchedMovies` anidado, `watchlist`), y que un cliente sin autenticar no puede leer ni escribir nada.

## Fecha de build

El footer de `/` muestra "Deployed {fecha}" de forma discreta. Se captura en build time vía `vite.define` en `astro.config.mjs` (`__BUILD_TIME__`, declarado en `src/env.d.ts`), no con `new Date()` en el componente — como el output es `server` (SSR por request), un `new Date()` ahí mostraría la hora de cada visita, no la del deploy.

## Analytics

`@vercel/analytics/astro` y `@vercel/speed-insights/astro` montados en `Layout.astro`. Requiere activarlos también en el dashboard de Vercel (Analytics y Speed Insights) para que empiecen a recolectar datos.

### Sentry (errores)

`@sentry/astro` en `astro.config.mjs`, captura cliente + servidor (SSR: la integración inyecta su propio middleware de instrumentación, independiente de `src/middleware.ts`). Sin config de cliente/servidor propia — el SDK lee `PUBLIC_SENTRY_DSN` automáticamente por convención del integration; si no está seteada, es un no-op silencioso (no rompe build ni runtime, verificado localmente sin esas env vars).

`org`/`project`/`authToken` (para subir sourcemaps y tener stack traces legibles) solo se pasan cuando existe `SENTRY_AUTH_TOKEN` — si no, el paso de upload se saltea (`sentry-vite-plugin` solo imprime un warning informativo en build, no falla). `telemetry: false` siempre, para no mandar datos de uso del plugin a Sentry.

`connect-src` en `src/middleware.ts` incluye `*.sentry.io` + los dos endpoints de ingest regionales (`*.ingest.us.sentry.io`, `*.ingest.de.sentry.io`) — sin esto el CSP bloquearía silenciosamente los reportes de error del cliente.

**Pendiente de tu lado** (no se puede hacer desde el código): crear el proyecto en sentry.io y setear `PUBLIC_SENTRY_DSN` en Vercel (Production + Preview).

## Performance

- **Bundle de Firebase aislado**: `astro.config.mjs` fuerza `firebase`/`@firebase/*` a su propio chunk vía `rollupOptions.output.manualChunks`. Antes se mezclaba con código UI compartido (`button.tsx`), generando un chunk de >500kB que cargaba toda página independientemente de si usaba Firebase. Ahora es un chunk propio, cacheable por separado. El tamaño (~500kB) es el SDK en sí — no baja más sin cambiar de SDK.
- `<UserMenu>` usa `client:idle` (no `client:load`) — es chrome de navegación, no contenido crítico; no debería competir por el hilo principal con el contenido real de la página.
- **`src/lib/tmdb/image.ts`**: helpers `tmdbImageUrl`, `tmdbDensitySrcSet` (1x/2x, para avatares/thumbnails de tamaño fijo) y `tmdbWidthSrcSet` (para imágenes que escalan con su contenedor — grids, posters grandes). Todos los `<img>`/`<AvatarImage>` que apuntan a TMDB usan `srcSet` con el tamaño real de renderizado, no un tamaño fijo sobredimensionado.
- **Cache-Control en `/api/*`**: `src/lib/api.ts` (`jsonResponse`) agrega `public, s-maxage=N, stale-while-revalidate=10N` a las respuestas de TMDB — son idénticas para cualquier visitante, así que se comparten en el CDN de Vercel entre usuarios, no solo en el navegador de cada uno. TTLs: búsqueda 1h, perfil+filmografía 6h, fotos/detalle de película 1d.
- **Lighthouse CI** (`.github/workflows/lighthouse.yml`, `.lighthouserc.json`): corre semanalmente (o manual) contra las URLs de producción ya desplegadas (`/`, `/search`, `/watchlist`) — no contra un build local, porque el adapter de Vercel genera una función serverless y `astro preview` no puede levantarla. Asserts en modo `warn` (informativo, no bloquea CI).

## Seguridad

- **`src/middleware.ts`**: agrega headers de seguridad a toda respuesta — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (sin cámara/micrófono/geolocalización — la app no los usa), y una `Content-Security-Policy`.
- **CSP**: `connect-src` no incluye `api.themoviedb.org` porque el browser nunca llama a TMDB directo — todo pasa por `/api/*` server-side (mismo origen). Los dominios de Google (`*.googleapis.com`, `accounts.google.com`, `*.firebaseapp.com`) están permitidos en bloque en vez de uno por uno: el login con Google y Firestore tocan varios subdominios, y una CSP demasiado estricta puede romper el login silenciosamente (solo se ve en la consola del navegador, no en build/CI). `script-src`/`style-src` llevan `'unsafe-inline'` porque Astro inyecta scripts de hidratación y estilos inline — una CSP con nonces sería más estricta pero bastante más frágil de mantener para el tamaño de este proyecto.
- **Rate limiting** (`src/lib/rateLimit.ts`): limitador en memoria por IP, 30 req/min por endpoint, aplicado a los 4 proxies de TMDB (`/api/search-person`, `/api/person/[id]`, `/api/person/[id]/images`, `/api/movie/[id]`). No persiste entre cold starts ni se comparte entre regiones — no es un límite estricto, es un freno barato a un bug o scraper que agote la cuota de TMDB. Funciona porque Fluid Compute de Vercel reutiliza instancias entre requests (el `Map` en memoria sobrevive invocaciones calientes).
- **Dependabot** (`.github/dependabot.yml`): PRs semanales para dependencias npm (agrupadas si son solo devDependencies) y GitHub Actions.
- **Firebase App Check**: pendiente — requiere que el usuario registre una site key de reCAPTCHA v3 y active "Enforce" en la consola de Firebase; no es algo que se pueda completar solo desde el código. Ver TODO.md.

## PWA

- **Service worker escrito a mano** (`public/sw.js`), sin Workbox. Se intentó `@vite-pwa/astro` primero — su `virtual:pwa-register` no resuelve en el build SSR de este stack (Astro 7 / Vite 8, más nuevo que lo que el paquete declara soportar en su `peerDependencies`, tope `astro@^5`): Rolldown falla intentando resolver `workbox-window` (API de browser) dentro del bundle de servidor. Se removió la dependencia y se implementó manual — menos "mágico", pero sin riesgo de incompatibilidad de versión.
- **`public/manifest.webmanifest`**: estático, enlazado desde `Layout.astro`. Íconos generados una sola vez desde `public/pwa-source-icon.svg` (un bookmark blanco sobre fondo negro — no existía logo de marca, se usó el mismo motivo que ya es central en la UI) vía `pnpm dlx @vite-pwa/assets-generator` (herramienta de un solo uso, no quedó como dependencia del proyecto).
- **Registro**: `<script is:inline>` en `Layout.astro` — `is:inline` es necesario para que Astro deje el script intacto y no intente procesarlo/empaquetarlo (ahí fue donde falló el enfoque con `virtual:pwa-register`).
- **Estrategia de cacheo** (`public/sw.js`):
  - Navegación (HTML de página) → network-first, cae a caché si no hay red. Así una página que ya visitaste queda disponible offline.
  - `image.tmdb.org` → cache-first (los posters no cambian una vez publicados).
  - `/api/*` (proxy a TMDB) → network-first con fallback a caché — datos frescos con red, últimos vistos sin ella.
  - Resto del mismo origen (JS/CSS/íconos) → cache-first.
  - No persiste vistos-por-usuario (eso lo maneja Firestore, no el service worker) — esto es solo "lo que ya cargaste en el navegador queda disponible sin red".
- **Gotcha de desarrollo**: el `cache-first` de assets del mismo origen puede servir JS viejo en `localhost` si el service worker de una sesión anterior sigue registrado mientras cambia el código — en dev, Vite no usa nombres de archivo con hash de contenido como en producción, así que un chunk cacheado puede quedar desincronizado con el HTML nuevo (síntoma: "Invalid hook call" / instancias de React duplicadas, nada que ver con el código real). Si algo se ve raro en dev después de tocar el service worker, primero: DevTools → Application → Service Workers → Unregister, y borrar Cache Storage. En producción no aplica — los bundles sí llevan hash de contenido.

## Dark mode

- Tema por clase (`.dark` en `<html>`), no solo `prefers-color-scheme` — los tokens de shadcn ya venían listos para esto (`:root` / `.dark` en `global.css`), solo faltaban el toggle y la persistencia.
- **Anti-flash**: script `is:inline` bloqueante, primera línea del `<head>` (antes que cualquier CSS) — lee `localStorage.theme`, si no hay nada usa `prefers-color-scheme` del sistema, y aplica la clase antes del primer paint. Sin esto habría un parpadeo del tema equivocado en cada carga.
- `ThemeToggle.tsx`: el ícono (sol/luna) se decide por CSS (`dark:hidden` / `hidden dark:block`), no por estado de React — así no hay parpadeo del ícono incorrecto mientras el componente hidrata, ya que la clase `.dark` ya quedó bien puesta por el script bloqueante antes de que React entre en juego.

## FollowedPeopleHero (home)

Reemplazó a un experimento anterior con Three.js (sistema solar de caras orbitando) — se descartó por pedido explícito ("prefiero algo más animado con GSAP"), con una referencia de Dribbble cuyo título ("SOLAR — Hero Interaction") resultó ser el nombre de una marca de ropa, no un tema espacial: el diseño real era una fila de fotos de moda con entrada escalonada y layout editorial asimétrico. Se adaptó ese concepto a las fotos de personas seguidas.

- **GSAP vanilla** (`gsap.context` para scope + cleanup automático vía `ctx.revert()`), sin plugins adicionales (no hace falta ScrollTrigger — nada depende del scroll).
- Capas de movimiento: entrada escalonada (`gsap.from` con `stagger`), flotación continua sutil por tarjeta (cada una con su propia duración/delay, para que nunca se vea "congelado"), y parallax de mouse (`gsap.quickTo` — la API pensada para updates de alta frecuencia como `pointermove`) donde las tarjetas más cercanas al centro de la fila se mueven más que las de los extremos.
- Offsets verticales alternados (`OFFSETS`) le dan a la fila un borde superior irregular tipo editorial, en vez de una grilla plana — el guiño al layout asimétrico de la referencia.
- Solo se muestra si hay al menos una persona seguida con foto; máximo 8 tarjetas.
- **Precarga antes de mostrar**: las fotos se precargan con `new Image()` (`Promise.all`, cada una resuelve en `onload` u `onerror` — un error no cuelga el spinner, solo esa foto no cuenta como "lista") antes de montar las tarjetas; mientras tanto se ve un spinner simple (`Loader2Icon` girando). Evita el parpadeo de imágenes rotas/a medio cargar antes de que arranque la animación de entrada de GSAP.
- **Gotcha real (no ambiguo, con causa raíz confirmada)**: `import gsap from "gsap"` a nivel de módulo tumbaba la función serverless en producción — `SyntaxError: Cannot use import statement outside a module`. Causa: Astro sigue renderizando este componente en el servidor para el HTML inicial aunque sea `client:load` (así funciona la hidratación), así que cualquier import de nivel superior termina también en el bundle del servidor; el paquete de gsap es ESM-only y el bundler de la función de Vercel no lo interopera bien vía `require()`. Fix: `import("gsap")` dinámico **dentro del `useEffect`** — el efecto nunca corre en el servidor, así que gsap nunca se evalúa ahí. Se encontró recién en el primer deploy a producción (el build local había pasado limpio) — antes de dar por bueno un cambio con dependencias nuevas usadas solo client-side, vale la pena revisar los logs de la función (`vercel logs <url>`), no solo el resultado del build.

## Exportar datos

- `exportUserData(userId)` en `firestore.ts`: lectura puntual (`getDocs`, no `onSnapshot`) de personas seguidas + sus `watchedMovies` + watchlist completos, aplanado a un objeto plano con timestamps de Firestore convertidos a ISO string (`toIso` — Firestore `Timestamp` no serializa a JSON legible tal cual).
- Botón "Export data" en `UserMenu.tsx` → `downloadJson()` (`src/lib/download.ts`, `Blob` + `URL.createObjectURL` + `<a download>` sintético) — nombre de archivo con la fecha (`filmo-export-YYYY-MM-DD.json`).

## Accesibilidad

- **`src/lib/a11y.ts`** (`announce(message)`) escribe en una región `aria-live="polite"` compartida (`#a11y-announcer` en `Layout.astro`, oculta con `sr-only`) — se usa en marcar/desmarcar vista, seguir/dejar de seguir, agregar/quitar de watchlist. El texto se limpia y se reescribe con un `setTimeout` corto para forzar el anuncio incluso si el mensaje se repite (ej. togglear el mismo checkbox dos veces seguidas).
- **`.focus-ring`** (`global.css`, `@layer utilities`): ring de foco visible reutilizable para los elementos interactivos que no pasan por el `Button`/`Checkbox` de shadcn (esos ya traen su propio `focus-visible` de fábrica) — links del nav, `PersonCard`, tarjeta de `FollowedPersonCard`, botón de poster en `MovieItem`, link "via {persona}" del watchlist. No incluye `rounded` a propósito: entraba en conflicto con el `rounded-lg` que ya tenían varias de esas tarjetas.
- **`axe-core`**: `.github/workflows/accessibility.yml`, semanal + manual, corre `@axe-core/cli` contra las URLs de producción (mismo patrón que `lighthouse.yml`) — informativo (`continue-on-error: true`), no bloquea. Usa `npx`, no `pnpm dlx` — `pnpm dlx` no corre postinstall scripts por defecto, y sin eso el binario de chromedriver nunca se descarga (`ENOENT` al ejecutar). No se pudo probar en local (Mac) por el mismo motivo con `pnpm dlx`; el runner de GitHub Actions (Ubuntu) sí lo resuelve con `npx`.
- **Primer hallazgo real, corregido**: `page-has-heading-one` en `/` y `/watchlist`. Causa: el `<h1>` vivía dentro de una rama condicional de `Dashboard.tsx`/`WatchlistPage.tsx` que depende del estado de auth (`authLoading`) — como Firebase resuelve la sesión async en el cliente, tanto el HTML servido por SSR como cualquier scan que llegue antes de que ese estado resuelva ven el skeleton de carga, que no tenía heading. Fix: el `<h1>` ahora está presente en **todas** las ramas de cada componente (visualmente oculto con `sr-only` en el estado de carga) — no es un parche para pasar el audit, es un bug real de estructura semántica.
- Segundo hallazgo, **excepción aceptada a propósito**: `color-contrast` en el pie "Deployed {fecha}" — `opacity-50` → `opacity-70` no fue suficiente para pasar WCAG AA, y seguir subiendo la opacidad choca directo con el pedido explícito de que ese texto sea "muy discreto" (ver historial). Es un elemento decorativo de un solo bit de información (fecha del último deploy), no contenido funcional — se deja tal cual conscientemente en vez de perder la discreción por cumplir la regla al 100%.
