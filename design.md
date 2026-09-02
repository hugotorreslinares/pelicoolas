# Design

Referencia técnica del estado actual de Filmo. Para la visión de producto y alcance del MVP ver el PRD original (no versionado en el repo).

## Filosofía de producto

Filmo responde una sola pregunta: _¿he visto todas las películas de esta persona?_ No compite con Letterboxd (ratings/reviews/social) — el núcleo es el checklist de una filmografía.

## Astro vs React

- **Astro**: routing, layouts, SSR, fetch a TMDB (server-side, la API key nunca llega al cliente).
- **React** (`client:load`): solo componentes interactivos — `PersonSearch`, `Filmography`, `FollowButton`, `UserMenu`, `Dashboard`, `WatchlistPage`, `MovieDetailsDialog`, `PersonPhotoGallery`.
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
- **GitHub Actions** (`.github/workflows/ci.yml`): en cada push/PR a `main` corre `format:check` → `lint` → `astro check` → `build`. No necesita secrets: con `output: "server"` ninguna página se prerenderiza en build (todas tienen `prerender = false`), así que no hay fetch a TMDB ni init de Firebase durante `pnpm build`.

## Fecha de build

El footer de `/` muestra "Deployed {fecha}" de forma discreta. Se captura en build time vía `vite.define` en `astro.config.mjs` (`__BUILD_TIME__`, declarado en `src/env.d.ts`), no con `new Date()` en el componente — como el output es `server` (SSR por request), un `new Date()` ahí mostraría la hora de cada visita, no la del deploy.

## Analytics

`@vercel/analytics/astro` y `@vercel/speed-insights/astro` montados en `Layout.astro`. Requiere activarlos también en el dashboard de Vercel (Analytics y Speed Insights) para que empiecen a recolectar datos.

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
