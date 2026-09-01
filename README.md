# Filmo — Filmography Tracker

Sigue actores, actrices o directores y lleva registro de qué películas de su filmografía ya viste. MVP enfocado en una sola tarea: completar la filmografía de la gente que te interesa.

## Stack

- **Astro** — routing, layouts, SSR
- **React** — islas interactivas (search, filmografía, watchlist)
- **shadcn/ui + Tailwind** — componentes
- **Firebase** — Auth (Google) + Firestore
- **TMDB API** — datos de personas y películas (proxied server-side, la API key nunca se expone al cliente)
- **Vercel** — hosting

## Funcionalidades

- Buscar actores/actrices/directores, con búsquedas recientes guardadas en el navegador (localStorage)
- Ver filmografía ordenada cronológicamente, con detalle de cada película en modal
- Panel "Personal Info" en el perfil (nacimiento, lugar, alias) y galería de fotos de TMDB al hacer click en el avatar
- Seguir personas → aparecen en "My Filmographies" con progreso
- Marcar películas como vistas/pendientes, con filtros
- **Watchlist**: agregar cualquier película desde una filmografía a tu radar, con referencia a la persona desde la que la agregaste (`/watchlist`)

## Desarrollo local

```sh
pnpm install
pnpm dev
```

Copia `.env.example` a `.env` y completa:

- `TMDB_API_KEY` — TMDB v4 read access token (server-only)
- `PUBLIC_FIREBASE_*` — config del proyecto Firebase (cliente, público por diseño)

## Comandos

| Comando          | Acción                                   |
| :---------------- | :---------------------------------------- |
| `pnpm dev`         | Servidor local en `localhost:4321`        |
| `pnpm build`       | Build de producción a `./dist/`           |
| `pnpm astro check` | Typecheck                                  |

## Estructura

```text
src/
├── components/
│   ├── auth/          # LoginButton, UserMenu
│   ├── people/         # PersonSearch, PersonHeader, PersonInfo, PersonPhotoGallery, FollowButton
│   ├── filmography/    # Filmography, MovieItem, MovieDetailsDialog, WatchlistPage, Dashboard
│   └── ui/              # shadcn/ui
├── lib/
│   ├── firebase/        # client, auth, firestore
│   ├── tmdb/             # client, people, movies (server-only)
│   └── recentSearches.ts # localStorage helper (client-only)
├── pages/
│   ├── api/              # proxy endpoints a TMDB (search-person, person/[id], person/[id]/images, movie/[id])
│   ├── person/[id].astro
│   ├── search.astro
│   ├── filmographies.astro
│   └── watchlist.astro
└── types/
```

Modelo de datos en Firestore y reglas de seguridad: ver [firestore.rules](firestore.rules) y [design.md](design.md).
