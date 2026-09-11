# Pelicoolas — Filmography Tracker

Sigue actores, actrices o directores y lleva registro de qué películas de su filmografía ya viste. MVP enfocado en una sola tarea: completar la filmografía de la gente que te interesa.

## Stack

- **Astro** (output `server`) — routing, layouts, SSR
- **React** — islas interactivas (search, filmografía, watchlist, hero animado)
- **shadcn/ui + Tailwind v4** — componentes, dark mode
- **GSAP** — animación del hero de home
- **Firebase** — Auth (Google) + Firestore
- **TMDB API** — datos de personas y películas (proxied server-side, la API key nunca se expone al cliente)
- **OMDb API** — ratings de IMDb/Rotten Tomatoes/Metacritic en el detalle de película (opcional, `OMDB_API_KEY`; sin ella simplemente no se muestran)
- **Vercel** — hosting, Analytics, Speed Insights
- **Sentry** — error tracking cliente + servidor (requiere `PUBLIC_SENTRY_DSN`, ver `.env.example`)

## Funcionalidades

- Buscar actores/actrices/directores **o películas**, con pestañas separadas para no mezclar resultados; búsquedas recientes en grid (localStorage, solo en `/search`)
- **Quick search**: el ícono de búsqueda del header abre un dropdown que busca personas y películas en paralelo desde cualquier página, sin navegar a `/search`
- Ver filmografía ordenada cronológicamente, con detalle de cada película en modal — cast con link a la filmografía de cada actor, ratings externos (IMDb/RT/Metacritic vía OMDb), y botón para agregar directo al watchlist
- Panel "Personal Info" en el perfil (nacimiento, lugar, alias, colapsable en mobile) y galería de fotos de TMDB al hacer click en el avatar
- Barra de búsqueda persistente en la página de persona (sin recientes, para no distraer)
- Seguir personas → aparecen en "My Filmographies" con progreso, y como hero animado (GSAP) en home
- Marcar películas como vistas/pendientes, con filtros
- **Watchlist**: agregar cualquier película (desde una filmografía o desde la búsqueda de películas) a tu radar (grid tipo Pinterest, con score de TMDB), con filtro por género y, cuando aplica, referencia a la persona desde la que la agregaste
- **Connections**: qué películas comparten actores entre la gente que seguís — cruce gratis (co-protagonistas entre tus seguidos) más un escaneo opcional más profundo (cualquier actor repetido en tu filmografía, no solo los que seguís)
- **Engagement**: insignias por completar filmografías/hitos de watchlist, nudges de "te falta poco", página `/wrapped` con tu resumen del año, "on this day" en el perfil de cada persona — todo togglable en `src/config/engagement.json`
- Onboarding: carrusel de bienvenida la primera vez que entrás (una sola vez, `localStorage`)
- **Dark mode**: toggle sol/luna, persistente, sin flash al cargar
- **PWA instalable**: manifest + service worker (offline de lo ya visitado)
- **Exportar datos**: descarga tu progreso completo (seguidos, vistas, watchlist) en JSON desde el menú de usuario
- **Cache cliente en `localStorage`** para los proxies de persona/película (`src/lib/movieData.ts`) — evita re-pedir por red en cada carga de página lo que ya se pidió antes (ver design.md)
- Accesibilidad: foco visible en todo lo interactivo (con touch targets de 44px en el nav), skip-link, anuncios `aria-live` en cambios de estado, auditoría `axe-core` automática

## Desarrollo local

```sh
pnpm install
pnpm dev
```

Copia `.env.example` a `.env` y completa:

- `TMDB_API_KEY` — TMDB v4 read access token (server-only)
- `PUBLIC_FIREBASE_*` — config del proyecto Firebase (cliente, público por diseño)
- `OMDB_API_KEY` — opcional, server-only (ratings externos en el detalle de película; sin ella esa sección simplemente no aparece)

## Comandos

| Comando             | Acción                                                                 |
| :------------------ | :--------------------------------------------------------------------- |
| `pnpm dev`          | Servidor local en `localhost:4321`                                     |
| `pnpm build`        | Build de producción a `./dist/`                                        |
| `pnpm astro check`  | Typecheck                                                              |
| `pnpm lint`         | ESLint                                                                 |
| `pnpm format:check` | Prettier                                                               |
| `pnpm test`         | Vitest (lógica pura)                                                   |
| `pnpm test:rules`   | Tests de `firestore.rules` contra el Firebase Emulator (necesita Java) |
| `pnpm test:e2e`     | Playwright: flujo core buscar → seguir → marcar vista (necesita Java)  |

CI (GitHub Actions) corre las primeras cinco cosas de arriba en el job `ci`, y `pnpm test:rules`/`pnpm test:e2e` cada uno en su propio job (`firestore-rules`, `e2e`), en cada push/PR a `main`. Pre-commit (Husky + lint-staged) hace `eslint --fix` + `prettier --write` sobre lo staged. Hay además dos workflows semanales/manuales: Lighthouse (performance) y axe-core (accesibilidad), ambos informativos contra producción.

## Estructura

```text
src/
├── components/
│   ├── auth/           # LoginButton, UserMenu (incluye export de datos)
│   ├── theme/           # ThemeToggle (dark mode)
│   ├── search/           # HeaderSearch (dropdown), SearchTabs (página /search)
│   ├── movies/            # MovieSearch, MovieResultRow, MovieWatchlistButton
│   ├── connections/        # ConnectionsPage
│   ├── onboarding/          # OnboardingCarousel (una sola vez, localStorage)
│   ├── wrapped/               # WrappedStats (página /wrapped)
│   ├── people/          # PersonSearch, PersonHeader, PersonInfo, PersonPhotoGallery, FollowButton
│   ├── filmography/     # Filmography, MovieItem, MovieDetailsDialog, WatchlistPage,
│   │                     # Dashboard, FollowedPeopleHero (GSAP)
│   └── ui/                # shadcn/ui
├── lib/
│   ├── firebase/         # client, auth, firestore (incluye exportUserData, badges)
│   ├── tmdb/              # client, people, movies, image, genres (server-only salvo image.ts/genres.ts)
│   ├── omdb.ts             # ratings externos (IMDb/RT/Metacritic), nunca rompe si falla
│   ├── movieData.ts         # fetchPersonData/fetchMovieDetails — wrapper cacheado de /api/person
│   │                          # y /api/movie, reusar en vez de fetch() a mano (ver design.md)
│   ├── clientCache.ts         # cache genérico con TTL sobre localStorage, usa movieData.ts
│   ├── a11y.ts             # announce() — región aria-live compartida
│   ├── api.ts               # helpers de respuesta JSON + rate limiting para /api/*
│   ├── rateLimit.ts          # limitador en memoria por IP
│   ├── download.ts            # descarga de JSON en el navegador
│   └── recentSearches.ts       # localStorage helper (client-only)
├── config/
│   └── engagement.json    # toggles de badges/nudges/wrapped/on-this-day
├── middleware.ts          # headers de seguridad (CSP, etc.) en toda respuesta
├── pages/
│   ├── api/                # proxy endpoints a TMDB (search-person, search-movie, person/[id],
│   │                        # person/[id]/images, movie/[id]) — cacheados y rate-limited
│   ├── person/[id].astro
│   ├── search.astro
│   ├── filmographies.astro
│   ├── watchlist.astro
│   ├── connections.astro
│   └── wrapped.astro
└── types/

public/
├── manifest.webmanifest   # PWA
├── sw.js                    # service worker (hand-written, sin Workbox)
└── pwa-*.png, favicon.ico    # íconos generados desde pwa-source-icon.svg
```

Modelo de datos en Firestore, reglas de seguridad, y el porqué de cada decisión no obvia (CSP, PWA, rate limiting, gotchas de deploy): ver [firestore.rules](firestore.rules) y [design.md](design.md). Ideas pendientes para llevar el proyecto a otro nivel técnico: [TODO.md](TODO.md).
