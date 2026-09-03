# TODO — Nivel técnico

No es para escalar a muchos usuarios; es para que el proyecto esté a la altura de una app "grande" en cuanto a calidad, robustez y mantenibilidad.

## Calidad de código

- [x] **ESLint + Prettier** — flat config, `eslint-plugin-astro` + `eslint-plugin-react-hooks` (solo reglas clásicas) + `eslint-plugin-jsx-a11y`. Ver `design.md`.
- [x] **Husky + lint-staged** — `eslint --fix` + `prettier --write` en pre-commit, solo sobre staged.
- [x] **GitHub Actions** (`.github/workflows/ci.yml`): format:check → lint → astro check → build, en cada push/PR a `main`.
- [x] **Vitest** para unit tests de lógica pura — `calculateAge`, `sortFilmography`/`dedupeByMovieId`/`toReleaseYear`, `toGender`, `recentSearches.ts` (17 tests). Config vía `getViteConfig` de `astro/config` (respeta el alias `@/` y env de Astro), `environment: "jsdom"` para los tests que tocan `localStorage`. `pnpm test` corre en CI justo antes del build.
- [x] **Playwright** E2E del flujo core: buscar → seguir → marcar vista → ver progreso (`tests-e2e/core-flow.spec.ts`). TMDB mockeado con un servidor de fixtures propio (`tests-e2e/mock-tmdb-server.mjs`, apuntado vía `TMDB_API_BASE_URL`) — nunca toca la API real ni gasta cuota. Auth/Firestore reales via emulador (usuario sembrado por REST en el Auth emulator, sign-in vía un bypass del popup de Google expuesto solo bajo `PUBLIC_USE_FIREBASE_EMULATOR`). `pnpm test:e2e` corre en su propio job de CI (`e2e` en `ci.yml`). Detalle completo en `design.md`.
- [x] **Firebase Emulator Suite** + tests de `firestore.rules` — `tests/firestore.rules.test.ts` (8 tests con `@firebase/rules-unit-testing`), cubre: usuario lee/escribe su propio doc, otro usuario no puede leer/escribir el ajeno, cliente sin auth no puede nada, `followedPeople` + `watchedMovies` anidado, y `watchlist`. `pnpm test:rules` (`firebase emulators:exec`) — separado de `pnpm test`/CI principal porque necesita JVM; corre en su propio job de CI (`firestore-rules` en `ci.yml`, `ubuntu-latest` ya trae Java).

## Observabilidad

- [x] **Vercel Analytics + Speed Insights** — montados en `Layout.astro`. Falta activarlos en el dashboard de Vercel para que empiecen a recolectar.
- [x] **Sentry** — `@sentry/astro` integrado en `astro.config.mjs`, captura cliente + servidor (incluye SSR vía middleware automático del integration). **Requiere acción tuya para activarse**: no puedo crear la cuenta/proyecto de Sentry por ti. Pasos: 1) crear proyecto en sentry.io (plataforma Astro), 2) copiar su DSN a `PUBLIC_SENTRY_DSN` en Vercel (Production + Preview), 3) opcional para stack traces legibles — `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (sourcemap upload en build). Sin `PUBLIC_SENTRY_DSN` el SDK es un no-op silencioso — build y runtime no se rompen (verificado local: `pnpm build` sin esas env vars solo imprime warnings informativos de sourcemap, no falla).
- [x] **Structured logging** en los endpoints `/api/*` — `logApiError()` en `src/lib/api.ts`: los 4 endpoints, al capturar un `TmdbError`, ahora emiten una línea JSON (`{level, route, message}`) a stdout (legible en Vercel function logs) y la reportan a Sentry (`Sentry.captureException`) antes de devolver el 502 genérico al cliente — la causa real ya no se pierde. Verificado en dev forzando una API key inválida: el log mostró `{"level":"error","route":"search-person","message":"TMDB request failed: 401 /search/person"}`.

## Performance

- [x] Chunk de >500kB — era Firebase mezclado con código UI compartido. Aislado en su propio chunk vía `manualChunks`. Ver `design.md`.
- [x] `srcset` responsivo en imágenes de TMDB — `src/lib/tmdb/image.ts` (density para tamaño fijo, width-based para grids/fluid).
- [x] `Cache-Control` en los endpoints `/api/*` (compartido en el CDN de Vercel entre usuarios, no solo por navegador).
- [x] Lighthouse CI — corre semanal/manual contra producción (`.github/workflows/lighthouse.yml`), en modo informativo (warn, no bloquea).
- [ ] `client:idle`/`client:visible` en más islas si algún día se siente lento — por ahora solo `UserMenu` lo necesitaba; el resto es contenido primario de cada página (diferirlo perjudicaría la interacción real, no la ayudaría).
- [x] **Investigado el score de Lighthouse contra prod real** — las sospechas originales (cold-start serverless, CSS bloqueante) no se confirmaron: TTFB actual es ~80ms, nada de "durmiendo". `/` (0.88–0.95) y `/search` (0.99) ya estaban bien; el real problema era **`/watchlist` en 0.71 por CLS ~0.96** (shift enorme, casi el peor posible). Causa: `WatchlistPage.tsx` mostraba el mismo skeleton alto (grid de 8 posters) tanto mientras resolvía el auth check como mientras cargaba el watchlist — para un visitante anónimo (el caso común, y el que ve Lighthouse), ese skeleton alto colapsaba de golpe al mensaje corto "Sign in to keep movies on your radar", el shift más grande de toda la página. Fix: separar el estado "resolviendo auth" (skeleton chico, del tamaño del mensaje de sign-in) del estado "hay usuario, cargando películas" (el skeleton alto, que ahora solo se muestra cuando sabemos que sí hay contenido real por venir). Verificado contra prod post-deploy: 0.71→0.96 performance, CLS 0.96→0.038.

## Seguridad

- [x] **Rate limiting** en los 4 endpoints `/api/*` — 30 req/min por IP, en memoria (`src/lib/rateLimit.ts`). Ver `design.md`.
- [x] Cabeceras de seguridad (CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) vía `src/middleware.ts`. Login con Google confirmado funcionando en producción tras el cambio.
- [x] Auditoría de dependencias automática — `.github/dependabot.yml` (npm semanal + GitHub Actions).
- [ ] **Firebase App Check** — hoy cualquiera con la `PUBLIC_FIREBASE_API_KEY` (pública por diseño, pero aun así) podría golpear Firestore directo si no hay reglas perfectas. App Check añade una capa de "esto viene de mi app real". **Bloqueado en ti**: requiere que registres una site key de reCAPTCHA v3 en tu cuenta de Google y actives "Enforce" en la consola de Firebase — son cuentas/consolas tuyas, no se puede completar desde el código ni con las credenciales que ya tengo.

## Producto (sin agregar features sociales)

- [x] **Dark mode** — toggle (`ThemeToggle.tsx`) + persistencia en localStorage + script anti-flash. Ver `design.md`.
- [x] **PWA** instalable con caché offline de lo ya visto — `public/sw.js` (manual, sin Workbox — `@vite-pwa/astro` no compila en este stack, ver `design.md`) + `public/manifest.webmanifest`. Ícono generado desde cero (bookmark blanco/negro, no había logo).
- [x] **Exportar/backup de datos** — "Export data" en el menú de usuario, descarga un JSON con personas seguidas, películas vistas y watchlist (`exportUserData` en `firestore.ts`).
- [x] Accesibilidad — foco visible (`.focus-ring` en `global.css`) en todos los interactivos que no pasan por el `Button` de shadcn (nav, cards, checkbox de película, link "via" del watchlist); `aria-live` (`src/lib/a11y.ts` + `#a11y-announcer`) en marcar visto, follow/unfollow, watchlist; auditoría `axe-core` semanal/manual contra producción (`.github/workflows/accessibility.yml`, informativo).

## Arquitectura / DX

- [x] **Tipos de respuesta TMDB compartidos + validación en runtime** — `src/types/tmdb.ts` define un schema Zod por endpoint (`tmdbSearchPersonResponseSchema`, etc.), con el tipo inferido del propio schema en vez de una interface separada. `tmdbFetch` ahora recibe el schema y hace `safeParse`; si TMDB cambia el shape, `TmdbError` explota en el momento en vez de propagar `undefined` silenciosamente a la UI.
- [ ] Documentar en `design.md` el porqué de cada decisión no obvia (ya iniciado) — mantenerlo vivo cada vez que se tome una decisión de arquitectura nueva.

## Prioridad sugerida si hay que elegir por dónde seguir

1. **Activar Sentry** — código ya integrado, falta que crees el proyecto en sentry.io y pongas `PUBLIC_SENTRY_DSN` en Vercel (ver sección Observabilidad arriba)
2. Resto, según lo que más te frustre en el día a día
