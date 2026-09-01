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
