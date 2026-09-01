# Design

Referencia técnica del estado actual de Filmo. Para la visión de producto y alcance del MVP ver el PRD original (no versionado en el repo).

## Filosofía de producto

Filmo responde una sola pregunta: *¿he visto todas las películas de esta persona?* No compite con Letterboxd (ratings/reviews/social) — el núcleo es el checklist de una filmografía.

## Astro vs React

- **Astro**: routing, layouts, SSR, fetch a TMDB (server-side, la API key nunca llega al cliente).
- **React** (`client:load`): solo componentes interactivos — `PersonSearch`, `Filmography`, `FollowButton`, `UserMenu`, `Dashboard`, `WatchlistPage`, `MovieDetailsDialog`, `PersonPhotoGallery`.
- `PersonInfo.astro` es estático (no necesita hidratación, solo texto derivado de props del servidor).

## Rutas

| Ruta | Descripción |
| :--- | :--- |
| `/` | Home — dashboard si hay sesión, CTA de búsqueda si no |
| `/search` | Buscar persona (TMDB), búsquedas recientes (localStorage) |
| `/person/[id]` | Perfil: foto (→ galería modal), Personal Info, filmografía |
| `/filmographies` | "My Filmographies" — personas seguidas + progreso |
| `/watchlist` | Películas guardadas, con referencia a la persona origen |
| `/api/search-person`, `/api/person/[id]`, `/api/person/[id]/images`, `/api/movie/[id]` | Proxy server-side a TMDB |

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
