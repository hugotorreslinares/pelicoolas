## Proyecto

Filmo — tracker de filmografías (Astro + React + Firebase + TMDB). Ver [README.md](README.md) (overview) y [design.md](design.md) (arquitectura, modelo de datos, gotchas de deploy) antes de trabajar en features nuevas.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Verificación

Antes de dar por terminado un cambio:

```sh
pnpm astro check   # typecheck
pnpm lint            # ESLint
pnpm format:check   # Prettier
pnpm build          # build completo (Vercel usa output: "server")
```

CI (`.github/workflows/ci.yml`) corre las mismas cuatro cosas en cada push/PR a `main`. Pre-commit (Husky + lint-staged) corre `eslint --fix` + `prettier --write` sobre los archivos staged — no hace typecheck completo, eso queda para CI.

## Convenciones del repo

- TMDB solo se consulta server-side (`src/lib/tmdb/`, `src/pages/api/`) — nunca exponer `TMDB_API_KEY` a componentes React.
- Componentes React solo para lo interactivo; páginas/routing/SSR en `.astro`.
- shadcn: agregar solo el componente que se necesita (`pnpm dlx shadcn@latest add <component>`), no instalar el catálogo completo.
- Botones tipo link usan `render={<a href="..." />}` (API de base-ui), no `asChild` con `<button><a>` anidado.
- Cambios a `firestore.rules` no se despliegan solos — avisar al usuario que debe publicarlos en Firebase Console o `firebase deploy --only firestore:rules`.
- Cambios a dependencias: revisar `pnpm-workspace.yaml` (`minimumReleaseAge`, `allowBuilds`) si el build de Vercel falla en `pnpm install` — ver design.md.
- **Librerías solo-cliente (gsap, y cualquier otra ESM-only o que asuma `window`/`document`) van con `import()` dinámico dentro del `useEffect`, nunca como `import` de nivel superior.** Un componente `client:load`/`client:idle` igual se renderiza en el servidor para el HTML inicial — un import top-level de una librería así puede pasar el build local limpio y romper solo en la función serverless real de Vercel. Ver el gotcha de `FollowedPeopleHero` en design.md.
- Antes de dar por bueno un cambio con una dependencia nueva usada solo en cliente, no basta con `pnpm build` local: probar contra un deploy real (`vercel` para preview o `vercel --prod`) y revisar `vercel logs <url>` si algo se ve raro.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
