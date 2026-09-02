# TODO — Nivel técnico

No es para escalar a muchos usuarios; es para que el proyecto esté a la altura de una app "grande" en cuanto a calidad, robustez y mantenibilidad.

## Calidad de código

- [x] **ESLint + Prettier** — flat config, `eslint-plugin-astro` + `eslint-plugin-react-hooks` (solo reglas clásicas) + `eslint-plugin-jsx-a11y`. Ver `design.md`.
- [x] **Husky + lint-staged** — `eslint --fix` + `prettier --write` en pre-commit, solo sobre staged.
- [x] **GitHub Actions** (`.github/workflows/ci.yml`): format:check → lint → astro check → build, en cada push/PR a `main`.
- [ ] **Vitest** para unit tests de lógica pura: `sortFilmography`, `dedupeByMovieId`, `toGender`, `ageAt`, helpers de `recentSearches.ts`. Son funciones puras, fáciles de testear y son justo donde se cuelan bugs sutiles (fechas, orden, dedupe).
- [ ] **Playwright** E2E para el flujo core: buscar → seguir → marcar vista → ver progreso. Mockear TMDB con fixtures fijos para no depender de la API real ni gastar cuota.
- [ ] **Firebase Emulator Suite** + tests de `firestore.rules` (`@firebase/rules-unit-testing`) — las reglas de seguridad nunca se han probado automáticamente, solo revisado a ojo.
- [ ] Agregar el job de CI también a la ejecución de tests una vez existan (Vitest/Playwright).

## Observabilidad

- [x] **Vercel Analytics + Speed Insights** — montados en `Layout.astro`. Falta activarlos en el dashboard de Vercel para que empiecen a recolectar.
- [ ] **Sentry** (o similar) para errores de cliente y servidor — hoy un error en producción es invisible salvo que lo veas tú mismo.
- [ ] **Structured logging** en los endpoints `/api/*` (hoy silencian el error real y devuelven un mensaje genérico).

## Performance

- [x] Chunk de >500kB — era Firebase mezclado con código UI compartido. Aislado en su propio chunk vía `manualChunks`. Ver `design.md`.
- [x] `srcset` responsivo en imágenes de TMDB — `src/lib/tmdb/image.ts` (density para tamaño fijo, width-based para grids/fluid).
- [x] `Cache-Control` en los endpoints `/api/*` (compartido en el CDN de Vercel entre usuarios, no solo por navegador).
- [x] Lighthouse CI — corre semanal/manual contra producción (`.github/workflows/lighthouse.yml`), en modo informativo (warn, no bloquea).
- [ ] `client:idle`/`client:visible` en más islas si algún día se siente lento — por ahora solo `UserMenu` lo necesitaba; el resto es contenido primario de cada página (diferirlo perjudicaría la interacción real, no la ayudaría).
- [ ] **Investigar el score real de Lighthouse** (primera corrida: performance 0.61, LCP 0.41 — bajo). Sospecha sin confirmar: cold-start de la función serverless en el plan free de Vercel (si no hay tráfico, "duerme"), más CSS de Tailwind bloqueando el render inicial. No se investigó a fondo esta sesión.

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

## Prioridad sugerida si hay que elegir por dónde seguir

1. Vitest para la lógica pura (sort/dedupe/age) — bugs reales ya ocurrieron ahí
2. Sentry — para dejar de ser ciego a errores en producción
3. Firestore rules tests con el emulador — es tu única capa de seguridad real
4. Resto, según lo que más te frustre en el día a día
