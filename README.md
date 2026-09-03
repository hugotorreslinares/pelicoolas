# Filmo — Filmography Tracker

Sigue actores, actrices o directores y lleva registro de qué películas de su filmografía ya viste. MVP enfocado en una sola tarea: completar la filmografía de la gente que te interesa.

## Stack

- **Astro** (output `server`) — routing, layouts, SSR
- **React** — islas interactivas (search, filmografía, watchlist, hero animado)
- **shadcn/ui + Tailwind v4** — componentes, dark mode
- **GSAP** — animación del hero de home
- **Firebase** — Auth (Google) + Firestore
- **TMDB API** — datos de personas y películas (proxied server-side, la API key nunca se expone al cliente)
- **Vercel** — hosting, Analytics, Speed Insights
- **Sentry** — error tracking cliente + servidor (requiere `PUBLIC_SENTRY_DSN`, ver `.env.example`)

## Funcionalidades

- Buscar actores/actrices/directores, con búsquedas recientes en grid (localStorage, solo en `/search`)
- Ver filmografía ordenada cronológicamente, con detalle de cada película en modal
- Panel "Personal Info" en el perfil (nacimiento, lugar, alias, colapsable en mobile) y galería de fotos de TMDB al hacer click en el avatar
- Barra de búsqueda persistente en la página de persona (sin recientes, para no distraer)
- Seguir personas → aparecen en "My Filmographies" con progreso, y como hero animado (GSAP) en home
- Marcar películas como vistas/pendientes, con filtros
- **Watchlist**: agregar cualquier película desde una filmografía a tu radar (grid tipo Pinterest, con score de TMDB), con referencia a la persona desde la que la agregaste y orden por año
- **Dark mode**: toggle sol/luna, persistente, sin flash al cargar
- **PWA instalable**: manifest + service worker (offline de lo ya visitado)
- **Exportar datos**: descarga tu progreso completo (seguidos, vistas, watchlist) en JSON desde el menú de usuario
- Accesibilidad: foco visible en todo lo interactivo, anuncios `aria-live` en cambios de estado, auditoría `axe-core` automática

## Desarrollo local

```sh
pnpm install
pnpm dev
```

Copia `.env.example` a `.env` y completa:

- `TMDB_API_KEY` — TMDB v4 read access token (server-only)
- `PUBLIC_FIREBASE_*` — config del proyecto Firebase (cliente, público por diseño)

## Comandos

| Comando             | Acción                             |
| :------------------ | :--------------------------------- |
| `pnpm dev`          | Servidor local en `localhost:4321` |
| `pnpm build`        | Build de producción a `./dist/`    |
| `pnpm astro check`  | Typecheck                          |
| `pnpm lint`         | ESLint                             |
| `pnpm format:check` | Prettier                           |
| `pnpm test`         | Vitest (lógica pura)               |

CI (GitHub Actions) corre las cinco cosas de arriba en cada push/PR a `main`. Pre-commit (Husky + lint-staged) hace `eslint --fix` + `prettier --write` sobre lo staged. Hay además dos workflows semanales/manuales: Lighthouse (performance) y axe-core (accesibilidad), ambos informativos contra producción.

## Estructura

```text
src/
├── components/
│   ├── auth/           # LoginButton, UserMenu (incluye export de datos)
│   ├── theme/           # ThemeToggle (dark mode)
│   ├── people/          # PersonSearch, PersonHeader, PersonInfo, PersonPhotoGallery, FollowButton
│   ├── filmography/     # Filmography, MovieItem, MovieDetailsDialog, WatchlistPage,
│   │                     # Dashboard, FollowedPeopleHero (GSAP)
│   └── ui/                # shadcn/ui
├── lib/
│   ├── firebase/         # client, auth, firestore (incluye exportUserData)
│   ├── tmdb/              # client, people, movies, image (server-only salvo image.ts)
│   ├── a11y.ts             # announce() — región aria-live compartida
│   ├── api.ts               # helpers de respuesta JSON + rate limiting para /api/*
│   ├── rateLimit.ts          # limitador en memoria por IP
│   ├── download.ts            # descarga de JSON en el navegador
│   └── recentSearches.ts       # localStorage helper (client-only)
├── middleware.ts          # headers de seguridad (CSP, etc.) en toda respuesta
├── pages/
│   ├── api/                # proxy endpoints a TMDB (search-person, person/[id],
│   │                        # person/[id]/images, movie/[id]) — cacheados y rate-limited
│   ├── person/[id].astro
│   ├── search.astro
│   ├── filmographies.astro
│   └── watchlist.astro
└── types/

public/
├── manifest.webmanifest   # PWA
├── sw.js                    # service worker (hand-written, sin Workbox)
└── pwa-*.png, favicon.ico    # íconos generados desde pwa-source-icon.svg
```

Modelo de datos en Firestore, reglas de seguridad, y el porqué de cada decisión no obvia (CSP, PWA, rate limiting, gotchas de deploy): ver [firestore.rules](firestore.rules) y [design.md](design.md). Ideas pendientes para llevar el proyecto a otro nivel técnico: [TODO.md](TODO.md).
