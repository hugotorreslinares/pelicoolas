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

users/{userId}/badges/{badgeId}
  type, label, description, earnedAt, personId?, personName?

users/{userId}/recommendations/{movieId}
  tmdbId, title, posterPath, releaseYear, voteAverage, addedAt

users/{userId}/seen/{movieId}
  tmdbId, title, posterPath, releaseYear, voteAverage, watchedAt
```

Reglas de seguridad: `request.auth.uid == userId` en cada nivel — ver [firestore.rules](firestore.rules). **Cambios a este archivo requieren deploy manual** (Firebase Console o `firebase deploy --only firestore:rules`); no se aplican solos al hacer push. **Excepción deliberada**: `recommendations` tiene `allow read: if true` — es el tablón público (`/board/{userId}`), pensado para compartir sin login; solo el dueño puede escribir.

## Filmografía (TMDB)

- Fuente: `person/{id}/combined_credits`.
- Actores → créditos de `cast`; directores → créditos de `crew` con `department === "Directing"`.
- Deduplicado por `tmdbMovieId`.
- Orden por año (toggle reciente/antiguo); películas sin fecha van al final, nunca se inventa el año.
- Validación en runtime con Zod: `src/types/tmdb.ts` define un schema por respuesta cruda de TMDB (snake_case), y el tipo se infiere del schema (`z.infer`) en vez de mantener una interface duplicada a mano. `tmdbFetch(path, schema, params?)` hace `schema.safeParse()` sobre el JSON y lanza `TmdbError` si no matchea — así un cambio de shape en la API externa falla ruidosamente en el momento del fetch en vez de propagar `undefined` silenciosamente hasta la UI.
- **Trending del home** (`getTrendingMovies()` en `lib/tmdb/movies.ts`, fuente `/trending/movie/week`): fetch server-side directo en `index.astro`, no vía `/api/*` — es contenido de la página en sí (como `getPersonProfile`/`getFilmography` en `/person/[id]`), no algo que el cliente pida por su cuenta, así que no necesita el hop extra ni el rate limiting de los endpoints `/api/*` (esos existen para proteger llamadas que sí origina el navegador). `<TrendingMovies>` reutiliza `MovieDetailsDialog` (el mismo modal que abre un poster en una filmografía) — un componente, dos puntos de entrada.
- **Búsqueda de películas** (`/api/search-movie`, `searchMovie()` en `lib/tmdb/movies.ts`, fuente `/search/movie`): mismo shape de respuesta que `/trending/movie/week`, así que reutiliza el schema Zod y el tipo `TrendingMovie` en vez de duplicarlos. `/search` (`SearchTabs.tsx`) alterna entre `PersonSearch` y el nuevo `MovieSearch` con dos botones — resultados de persona y de película nunca se mezclan en una sola lista. Click en un resultado abre `MovieDetailsDialog` (cast con links a `/person/{id}`, ya existía); el botón de watchlist es un componente aparte (`MovieWatchlistButton`) porque acá no hay un "seguido" (`sourcePersonId`) del que colgar la película — ver siguiente punto.
- **Ratings externos (OMDb)** (`src/lib/omdb.ts`, `getExternalRatings()`): TMDB no tiene Rotten Tomatoes ni Metacritic, solo su propio voto — `getMovieDetails()` los suma vía OMDb, usando el `imdb_id` que TMDB ya trae gratis en `/movie/{id}` (sin `append_to_response` extra), así no hace falta buscar por título (evitaría falsos positivos entre películas homónimas). `OMDB_API_KEY` server-only (`.env`, nunca al cliente); si falta la key, OMDb no responde, o la película no tiene `imdb_id`, `getExternalRatings()` devuelve `null` sin romper el resto del detalle — mismo criterio que el resto de las integraciones externas de la app (TMDB caído no tira abajo la home). No es un endpoint propio: piggybackea en la cache de 1 día que ya tiene `/api/movie/[id]`, así que no suma presión al free tier de OMDb (1000 req/día).
- **`WatchlistMovie.sourcePersonId`/`sourcePersonName` son opcionales**: una película agregada desde la filmografía de alguien que seguís lleva esos campos (el "via X" que se ve en `/watchlist`); una agregada desde la búsqueda de películas, no — no hay una persona de la que colgarla. `WatchlistPage` y el conteo por-persona en `Dashboard` (usado por el sort "Watchlist size") ignoran las entradas sin `sourcePersonId`.

## Tablón público de recomendaciones (`/board/{userId}`)

- **Objetivo: crecimiento**, no solo funcionalidad — pensado para compartir en redes. Cualquiera puede ver el tablón de cualquier usuario sin cuenta ni login; el resto de la app sigue exigiendo sign-in. El botón de estrella (`MovieRecommendButton.tsx`, junto al de watchlist en `MovieDetailsDialog`) es la única forma de agregar — separado del watchlist a propósito: watchlist es "quiero verla", esto es "la recomiendo a otros".
- **URL = uid de Firebase directo**, sin sistema de usernames — no hay uno en la app, y agregar uno solo para esto sería sobre-ingeniería. El uid no es secreto (ya es público de facto en cualquier app con perfiles), así que no es un problema de seguridad exponerlo en la URL.
- **`RecommendationsBoard.tsx` sirve dos vistas con el mismo componente**: si `user?.uid === userId` (dueño viendo su propio tablón, con sesión), aparecen botón de "Copy link" y controles para quitar películas; para cualquier otro visitante (con sesión ajena o sin sesión) es de solo lectura, con un CTA al final invitando a probar la app. Evita mantener dos componentes para la misma data.
- **Sin lectura server-side**: a diferencia de las páginas que traen datos de TMDB en el frontmatter de Astro, acá la página (`src/pages/board/[userId].astro`) solo pasa el `userId` de la URL — toda la lectura de Firestore pasa por el listener `onSnapshot` de siempre, client-side, sin necesitar sesión (permitido por la regla `allow read: if true`). Coherente con que el resto de la app nunca lee Firestore desde el servidor.
- **`MovieDetailsDialog` termina con tres toggles** (`MovieSeenButton`, `MovieRecommendButton`, `MovieWatchlistButton`), cada uno una colección Firestore aparte (`seen`, `recommendations`, `watchlist`) bajo `users/{userId}`, y los tres comparten el patrón `onRequireSignIn?` para que el diálogo muestre un único `LoginButton` sin sesión en vez de que cada botón dispare el suyo (pasó exactamente eso al agregar el segundo botón: dos prompts de "sign in" apilados).
- **`SeenMovie` (`users/{userId}/seen/{movieId}`) es un log personal separado de `WatchedMovie`** (`followedPeople/{personId}/watchedMovies/{movieId}`, el que alimenta el % de avance de una filmografía y los badges). No están sincronizados a propósito: marcar "vista" desde el diálogo genérico (búsqueda, watchlist, tablón de recomendaciones, Connections) no tiene una persona/filmografía específica a la que atribuirse, así que no puede tocar el modelo existente sin inventar una atribución falsa. Es deliberadamente un concepto distinto ("vi esta película alguna vez") del que ya existe ("la vi dentro de la filmografía de esta persona que sigo").

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

### Playwright E2E (`tests-e2e/`)

`pnpm test:e2e` corre el flujo core (buscar → seguir → marcar vista → ver progreso) contra la app real — no contra mocks de componentes — usando tres piezas que solo existen bajo este harness, nunca en dev normal ni producción:

- **TMDB mockeado, no la API real**: `tests-e2e/mock-tmdb-server.mjs` es un `http.createServer` standalone que sirve fixtures fijos (una persona y una película de prueba) en las mismas rutas que TMDB (`/search/person`, `/person/{id}`, etc.). `src/lib/tmdb/client.ts` acepta un override de `TMDB_BASE_URL` vía `import.meta.env.TMDB_API_BASE_URL` (mismo patrón que `TMDB_API_KEY`, no-op si no está seteada) que Playwright apunta al mock. Sin esto el E2E dependería de la API real y gastaría cuota en cada corrida de CI.
- **Auth/Firestore emulados, con bypass del popup de Google**: el login real de la app es `signInWithPopup` (Google) — imposible de automatizar en un browser headless. `src/lib/firebase/client.ts` conecta a los emuladores (`connectAuthEmulator`/`connectFirestoreEmulator`) solo cuando `PUBLIC_USE_FIREBASE_EMULATOR === "true"`, y en ese mismo bloque expone `window.__e2eSignIn` (llama `signInWithEmailAndPassword` directo) para que el test firme sesión sin pasar por Google. El usuario de prueba se siembra antes de cada corrida contra la REST API del Auth emulator (`accounts:signUp`) — no requiere credenciales de Admin SDK. Firestore se limpia (`DELETE .../documents`) en `beforeAll` para que "marcar vista" sea idempotente entre corridas locales repetidas (en CI el emulador siempre arranca vacío, así que ahí es un no-op).
- **CSP se abre solo bajo el mismo flag**: `src/middleware.ts` agrega `http://127.0.0.1:9099` y `:8080` a `connect-src` únicamente cuando `PUBLIC_USE_FIREBASE_EMULATOR === "true"` — si no, el fetch del SDK al emulador lo bloquea el propio CSP de la app (se descubrió así: el primer intento de sign-in fallaba con `auth/network-request-failed`).
- **Gotcha real de la primera carga en frío — re-optimización de dependencias de Vite**: el primer hit del navegador (no un `curl`/`fetch` plano — ese no ejecuta el bundle de cliente) a cualquier página en un `astro dev` recién arrancado puede hacer que Vite descubra que necesita pre-empaquetar una dependencia todavía no optimizada (en este caso, `@sentry/astro`, que se importa en cada página). Vite invalida su grafo de módulos a mitad del request e imprime `optimized dependencies changed. reloading` — cualquier `import()` dinámico de hidratación de un island que ya estaba en vuelo (`PersonSearch`, `UserMenu`, `ThemeToggle`) falla permanentemente con `Failed to fetch dynamically imported module`, y esos islands nunca hidratan (sin error visible para el usuario — el input queda ahí, pero sin `onChange` conectado, así que ninguna búsqueda dispara jamás). El test hace `page.reload()` una vez después del primer `goto("/search")` para sortear esto — para cuando ocurre el reload, Vite ya optimizó la dependencia y el segundo grafo de módulos se sirve completo. Encontrado leyendo `astro dev logs` durante una corrida fallida, no adivinado: sin eso hubiera parecido indistinguible de un timing race genérico.
- Adicionalmente, un `.fill()` de Playwright puede caer en la ventana entre "HTML servido por SSR" (input ya visible) y "React hidratado" (listener `onChange` conectado) incluso sin el problema de arriba — el test reintenta el fill dentro de un `expect(...).toPass()` hasta que el resultado aparece, en vez de asumir un delay fijo.
- `astro dev` (no `astro preview`, mismo motivo que el resto del repo: el adapter de Vercel no levanta localmente) puesto por Playwright como uno de sus `webServer`, junto al mock TMDB y `firebase emulators:start` — los tres se levantan y apagan solos. Puerto del hub de emuladores fijado a `4500` en `firebase.json` porque su default (4400) choca con el del mock TMDB.
- Job de CI separado (`e2e`, con `actions/setup-java` igual que `firestore-rules`) — necesita el browser de Playwright (`playwright install --with-deps chromium`) además de la JVM.

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
- **Skeletons de carga del tamaño del estado final, no de un estado distinto**: si un componente tiene un estado de carga "genérico" que cubre casos con tamaños finales muy distintos (p. ej. "cargando" vs "no hay usuario" vs "hay contenido"), ese único skeleton debe aproximarse al caso más común/rápido de resolver, no al más grande — de lo contrario el colapso de altura al resolver es un layout shift real medible en CLS. Encontrado así: `/watchlist` puntuaba 0.71 en Lighthouse por un CLS de 0.96, causado por exactamente este patrón en `WatchlistPage.tsx` (ver TODO.md, sección Performance).
- **Sentry: `bundleSizeOptimizations.excludeTracing` + `replaysSessionSampleRate`/`replaysOnErrorSampleRate: 0`** en `astro.config.mjs` — `@sentry/astro` bundlea `browserTracingIntegration` y, sobre todo, **Session Replay** en el cliente por defecto, aunque ninguno esté configurado ni se use. Session Replay era el grueso de un chunk cliente de ~271kB; con estas opciones baja a ~85kB. El build emite un warning de deprecación (`replaysSessionSampleRate`/`replaysOnErrorSampleRate` como opciones del integration de Astro pasarán a `sentry.client.config.ts` en una versión futura) — no rompe nada hoy, revisar si `@sentry/astro` sube de mayor versión.
- **Cache cliente en localStorage (`src/lib/clientCache.ts` + `src/lib/movieData.ts`, 2026-09-08)**: `Cache-Control: s-maxage` en `/api/*` solo cachea en el CDN de Vercel — el navegador nunca lo trata como cacheable propio (falta `max-age`), así que cada carga de página seguía siendo un round-trip de red real por request, aunque la respuesta ya estuviera en el edge. Con 30-50 personas seguidas, `Dashboard`/`ConnectionsPage`/`WrappedStats` disparaban 30-50 fetches a `/api/person/{id}` en cada carga. `fetchPersonData`/`fetchMovieDetails` en `movieData.ts` envuelven `/api/person/{id}` y `/api/movie/{id}` con un cache TTL en `localStorage` (mismo TTL que el `Cache-Control` del propio endpoint: 6h y 1d) — un cache hit no toca la red en absoluto. Consolida además 5 call-sites que repetían el mismo `fetch` a mano (`Dashboard`, `ConnectionsPage` ×2, `WrappedStats`, `MovieDetailsDialog`) en dos funciones compartidas. El resultado del deep-scan de `ConnectionsPage` (costoso: un `fetchMovieDetails` por película) también se cachea aparte, así no hay que re-escanear ni re-clickear el botón en cada visita.
- **`TrendingMovies.tsx`**: la primera imagen del grid (candidata a LCP para visitante sin sesión — es contenido SSR real, sin gate de JS/auth) lleva `loading="eager"` + `fetchPriority="high"`; el resto sigue `loading="lazy"`. Antes las 6 primeras imágenes (toda la fila visible) estaban en `lazy`, retrasando el LCP innecesariamente.
- **`FollowedPeopleHero` no es candidato real a optimización de imagen vía `fetchPriority`**: sus fotos se precargan por JS (`new Image()`) antes de montar el `<img>` real — la prioridad de red ya la decide el navegador al crear esos objetos `Image`, no el atributo del `<img>` final (que solo reusa la respuesta cacheada). Además, el componente entero está gateado detrás de auth + Firestore + hidratación, así que nunca es el elemento LCP real de la página.
- **Firebase eager-loaded pese al chunk propio**: `src/lib/firebase/client.ts` inicializa `initializeApp`/`getAuth`/`getFirestore` en top-level; casi todo componente con `client:load` que llama `useAuth()` (para saber si hay sesión) dispara la descarga+ejecución completa del SDK de inmediato. Evaluado convertirlo a `import()` dinámico — no reduce bytes reales: la mayoría de esos componentes necesitan el resultado de `useAuth()` para decidir qué renderizar, así que el chunk se pide igual, solo con un salto async de más. La única forma real de evitarlo es resolver la sesión server-side (cookie) y saltarse el chequeo de Firebase Auth en cliente para el pintado inicial — cambio de arquitectura mayor, no abordado en este pase.

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

## Engagement (badges, nudges, Wrapped)

- **`src/config/engagement.json`**: flag booleano por feature (`badges.*`, `nudges.*`, `wrapped`, `onThisDay`). JSON plano importado donde se necesita (`import engagement from "@/config/engagement.json"`) — funciona nativo en Vite/Astro, sin capa de config extra. Para desactivar algo, editar el archivo y redeployar (no hay panel de admin ni runtime toggle — no vale la pena para una app personal).
- **Badges persistidos, no calculados en vivo**: `users/{userId}/badges/{badgeId}` (`src/lib/firebase/badges.ts`, `awardBadgeOnce`/`subscribeToBadges`). `awardBadgeOnce` primero hace `getDoc` y no escribe si ya existe — así `earnedAt` queda fijo la primera vez, y el badge sobrevive aunque después dejes de seguir a la persona o se vuelva falsa la condición que lo originó (nada borra badges). IDs determinísticos (`person-complete-{tmdbId}`, `filmography-milestone-{3|10|25}`, etc.) hacen la escritura idempotente sin necesitar una transacción.
- **Dónde se evalúa cada condición** — en el componente que ya tiene los datos a mano, no en un service central: `Filmography.tsx` (completar una filmografía + década-span, tiene `watched`+`movies` de esa persona), `Dashboard.tsx` (milestones de N filmografías + actor/director, tiene `statsById` de todos los seguidos), `WatchlistPage.tsx` (milestones de watchlist, tiene la lista completa).
- **Actor/director son dos badges únicos, no tiers**: la primera vez que completás la filmografía de un actor y la primera vez que completás la de un director, cada una premia una sola vez (`actor-first-complete` / `director-first-complete`) — no hay niveles 3/10/25 por separado para cada categoría, para no inflar la cantidad de badges.
- **`FilmographyMovie.releaseDate`** (además de `releaseYear`, que ya existía): agregado específicamente para "on this day" en `/person/[id].astro` — necesita mes+día exactos, no solo el año. `getFilmography` en `lib/tmdb/movies.ts` guarda el `release_date` crudo de TMDB sin parsear.
- **Wrapped (`/wrapped`) reutiliza el fetch por-persona que ya hace `Dashboard.tsx`** (`/api/person/{id}`, cacheado 6h en el CDN) en vez de agregar un endpoint nuevo — evita gastar cuota de TMDB en una feature de "ver mis stats" que ya tiene los datos disponibles en otro lado. Deliberadamente **sin "horas totales vistas"**: hubiera requerido `getMovieDetails` (con `runtime`) por cada película vista individualmente, que no está en `FilmographyMovie` — ese volumen de requests por persona con muchas películas vistas arriesgaba el rate limit de `/api/movie/{id}` para poco valor real.
- **Firestore rules**: la subcolección `badges` necesitó su propio bloque en `firestore.rules` (mismo patrón `request.auth.uid == userId` que el resto) — **recordar publicarlo manualmente** (Firebase Console o `firebase deploy --only firestore:rules`) tras cualquier deploy que toque este archivo; si no, los `awardBadgeOnce` fallan silenciosamente con `permission-denied` en producción aunque el build pase limpio.

## Exportar datos

- `exportUserData(userId)` en `firestore.ts`: lectura puntual (`getDocs`, no `onSnapshot`) de personas seguidas + sus `watchedMovies` + watchlist completos, aplanado a un objeto plano con timestamps de Firestore convertidos a ISO string (`toIso` — Firestore `Timestamp` no serializa a JSON legible tal cual).
- Botón "Export data" en `UserMenu.tsx` → `downloadJson()` (`src/lib/download.ts`, `Blob` + `URL.createObjectURL` + `<a download>` sintético) — nombre de archivo con la fecha (`filmo-export-YYYY-MM-DD.json`).

## SEO

- `astro.config.mjs` define `site: "https://pelicoolas.vercel.app"` — sin eso, `Astro.site` es `undefined` y las URLs de canonical/Open Graph en `Layout.astro` saldrían rotas o relativas. Si el dominio cambia, actualizar acá.
- `Layout.astro` genera por página (props `description`, `image`, `noindex`, `canonicalPath`): `<meta name="description">`, `<link rel="canonical">`, Open Graph completo (`og:title/description/url/image/type/site_name`) y Twitter Card (`summary`, no `summary_large_image` — la imagen de fallback es el ícono cuadrado de la app, `/pwa-512x512.png`, no un banner 1200×630).
- **`noindex` en `/`, `/filmographies` y `/watchlist`**: son dashboards que requieren login; para un crawler anónimo (que nunca está logueado) muestran contenido fino y repetido — solo nav + un mensaje de "sign in", nada único. `/filmographies` además renderiza literalmente el mismo componente `<Dashboard>` que `/` — sin `noindex` serían contenido duplicado entre sí; con `canonicalPath="/"` en `/filmographies` queda resuelto igual por si algún buscador los indexa de todas formas. `/search` y `/person/[id]` sí son indexables: contenido real, público, y útil sin necesitar sesión.
- **`/person/[id]`**: `description` usa la biografía real de TMDB (truncada a 160 caracteres) cuando existe, con fallback genérico si no; `og:image`/`twitter:image` usan la foto real de la persona (`tmdbImageUrl(profile.profilePath, 500)`) en vez del ícono genérico de la app — mucho mejor preview al compartir un link.
- `public/robots.txt`: permite todo salvo `/api/*` (son endpoints JSON, no contenido).
- **Deliberadamente sin `sitemap.xml`**: las únicas rutas estáticas indexables son `/search` (`/` está `noindex`); el contenido real vive en `/person/{tmdbId}`, con IDs que vienen de TMDB — no hay forma de enumerarlos de antemano sin consultar toda la API de TMDB, así que un sitemap generado en build time no podría cubrir las páginas que de verdad importan. No vale la pena un sitemap que solo liste una URL.

## Accesibilidad

- **`src/lib/a11y.ts`** (`announce(message)`) escribe en una región `aria-live="polite"` compartida (`#a11y-announcer` en `Layout.astro`, oculta con `sr-only`) — se usa en marcar/desmarcar vista, seguir/dejar de seguir, agregar/quitar de watchlist. El texto se limpia y se reescribe con un `setTimeout` corto para forzar el anuncio incluso si el mensaje se repite (ej. togglear el mismo checkbox dos veces seguidas).
- **`.focus-ring`** (`global.css`, `@layer utilities`): ring de foco visible reutilizable para los elementos interactivos que no pasan por el `Button`/`Checkbox` de shadcn (esos ya traen su propio `focus-visible` de fábrica) — links del nav, `PersonCard`, tarjeta de `FollowedPersonCard`, botón de poster en `MovieItem`, link "via {persona}" del watchlist. No incluye `rounded` a propósito: entraba en conflicto con el `rounded-lg` que ya tenían varias de esas tarjetas.
- **`axe-core`**: `.github/workflows/accessibility.yml`, semanal + manual, corre `@axe-core/cli` contra las URLs de producción (mismo patrón que `lighthouse.yml`) — informativo (`continue-on-error: true`), no bloquea. Usa `npx`, no `pnpm dlx` — `pnpm dlx` no corre postinstall scripts por defecto, y sin eso el binario de chromedriver nunca se descarga (`ENOENT` al ejecutar). No se pudo probar en local (Mac) por el mismo motivo con `pnpm dlx`; el runner de GitHub Actions (Ubuntu) sí lo resuelve con `npx`.
- **Primer hallazgo real, corregido**: `page-has-heading-one` en `/` y `/watchlist`. Causa: el `<h1>` vivía dentro de una rama condicional de `Dashboard.tsx`/`WatchlistPage.tsx` que depende del estado de auth (`authLoading`) — como Firebase resuelve la sesión async en el cliente, tanto el HTML servido por SSR como cualquier scan que llegue antes de que ese estado resuelva ven el skeleton de carga, que no tenía heading. Fix: el `<h1>` ahora está presente en **todas** las ramas de cada componente (visualmente oculto con `sr-only` en el estado de carga) — no es un parche para pasar el audit, es un bug real de estructura semántica.
- Segundo hallazgo, **revisitado 2026-09-07**: `color-contrast` en el pie "Deployed {fecha}" (`opacity-70` sobre `text-muted-foreground`) — originalmente se había dejado como excepción aceptada a propósito (ver commits previos) para mantener el texto "muy discreto". Ante un pedido explícito de corregir accesibilidad, se priorizó cumplir AA: se sacó el `opacity-70` (el texto queda con el contraste normal de `text-muted-foreground`, ya usado en el resto de la app). Deja de ser "más discreto que el resto del texto secundario", pero dejó de fallar AA.
- **Auditoría 2026-09-07** (`npx @axe-core/cli` contra prod, tags WCAG 2.0/2.1/2.2 AA + best-practice): confirmado el fix de arriba (0 violaciones en `/`, `/search`, `/watchlist`, `/filmographies`). De paso, un falso positivo real: el modal de onboarding (ver sección Engagement/Onboarding) se abre automático en cualquier sesión sin `localStorage` — incluido el crawler de axe — y quedó capturado a mitad de la animación de entrada (`data-open:animate-in`), reportando `color-contrast` en textos que, con la animación asentada, dan contraste correcto (verificado a mano: 6.9:1, 17.16:1, etc.). Fix: `--load-delay 1500` en `accessibility.yml` antes de escanear.
- **Touch targets del nav (2026-09-07)**: los íconos de navegación (`navLinkClass` en `Layout.astro`) y el toggle de tema medían ~28-32px reales en mobile — por debajo del mínimo cómodo de ~44px (no es una falla WCAG dura: 2.5.8 solo exige 24px, pero es el estándar de facto de Apple/Google). Ambos ahora son `size-11` (44px) fijo.
- **Skip link**: no existía ("Bypass Blocks", WCAG 2.4.1) — agregado al principio del `<body>`, apunta a `#main-content` en el `<main>`, oculto con `sr-only` hasta que recibe foco.
