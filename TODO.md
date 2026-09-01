# TODO — Nivel técnico

No es para escalar a muchos usuarios; es para que el proyecto esté a la altura de una app "grande" en cuanto a calidad, robustez y mantenibilidad. Estado actual: cero tests, cero CI, cero linting, cero observabilidad. Todo lo demás está en buen punto para ser MVP.

## Calidad de código

- [ ] **ESLint + Prettier** — hoy no hay linting. `@typescript-eslint` + `eslint-plugin-astro` + `eslint-plugin-react-hooks`.
- [ ] **Vitest** para unit tests de lógica pura: `sortFilmography`, `dedupeByMovieId`, `toGender`, `ageAt`, helpers de `recentSearches.ts`. Son funciones puras, fáciles de testear y son justo donde se cuelan bugs sutiles (fechas, orden, dedupe).
- [ ] **Playwright** E2E para el flujo core: buscar → seguir → marcar vista → ver progreso. Mockear TMDB con fixtures fijos para no depender de la API real ni gastar cuota.
- [ ] **Firebase Emulator Suite** + tests de `firestore.rules` (`@firebase/rules-unit-testing`) — las reglas de seguridad nunca se han probado automáticamente, solo revisado a ojo.
- [ ] **Husky + lint-staged** — typecheck/lint en pre-commit.
- [ ] **GitHub Actions**: `astro check` + build + (futuro) tests en cada PR antes de mergear a `main`.

## Observabilidad

- [ ] **Sentry** (o similar) para errores de cliente y servidor — hoy un error en producción es invisible salvo que lo veas tú mismo.
- [ ] **Structured logging** en los endpoints `/api/*` (hoy silencian el error real y devuelven un mensaje genérico).
- [ ] **Vercel Analytics / Web Vitals** — saber si una página está lenta de verdad, no solo intuirlo.

## Performance

- [ ] Investigar el warning de build "chunks larger than 500kB" — probablemente Firebase SDK completo entrando al bundle del cliente. Code-split o lazy-load `firebase/auth` y `firebase/firestore` solo cuando se necesiten (islas que no usan auth no deberían pagar ese peso).
- [ ] **`astro:assets`** o al menos `srcset`/tamaños responsivos en posters TMDB — hoy se pide un tamaño fijo (`w185`, `w342`) sin importar el viewport real.
- [ ] Cachear respuestas de TMDB en el edge (Vercel Runtime Cache o `Cache-Control` en los endpoints `/api/*`) — hoy cada visita repite la misma llamada a TMDB para personas populares.
- [ ] Lighthouse CI en el pipeline, con presupuesto de performance/accesibilidad que falle el build si se degrada.

## Seguridad

- [ ] **Firebase App Check** — hoy cualquiera con la `PUBLIC_FIREBASE_API_KEY` (pública por diseño, pero aun así) podría golpear Firestore directo si no hay reglas perfectas. App Check añade una capa de "esto viene de mi app real".
- [ ] **Rate limiting** en `/api/search-person`, `/api/person/[id]`, `/api/movie/[id]` — sin límite, alguien (o un bug en el front) podría agotar la cuota de TMDB fácilmente.
- [ ] Cabeceras de seguridad (CSP, `X-Frame-Options`, etc.) vía `vercel.json` o middleware.
- [ ] Auditoría de dependencias automática (`pnpm audit` en CI, o Dependabot/Renovate).

## Producto (sin agregar features sociales)

- [ ] **Dark mode** — shadcn ya trae soporte de theming, falta el toggle y persistencia (localStorage).
- [ ] **PWA** instalable con caché offline de lo ya visto (service worker + manifest) — tiene sentido para uso personal/familiar en el celular.
- [ ] **Exportar/backup de datos** — botón "descarga tu progreso en JSON" desde Firestore. Es tu data, deberías poder sacarla sin depender de que el proyecto siga vivo.
- [ ] Accesibilidad: auditoría con `axe-core`, foco visible en todos los interactivos, `aria-live` en cambios de estado (marcar visto, follow, watchlist).

## Arquitectura / DX

- [ ] Extraer tipos de respuesta TMDB a un paquete/`types/tmdb.ts` compartido — hoy están duplicados como interfaces inline en cada archivo de `lib/tmdb/`.
- [ ] Documentar en `design.md` el porqué de cada decisión no obvia (ya iniciado) — mantenerlo vivo cada vez que se tome una decisión de arquitectura nueva.
- [ ] Considerar Zod (o similar) para validar las respuestas de TMDB en runtime — hoy se confía ciegamente en el shape de la API externa; si TMDB cambia algo, falla silenciosamente en producción.

## Prioridad sugerida si hay que elegir por dónde empezar

1. ESLint/Prettier + `astro check` en CI (barato, previene regresiones ya)
2. Vitest para la lógica pura (sort/dedupe/age) — bugs reales ya ocurrieron ahí
3. Sentry — para dejar de ser ciego a errores en producción
4. Firestore rules tests con el emulador — es tu única capa de seguridad real
5. Resto, según lo que más te frustre en el día a día
