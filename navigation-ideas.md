# Propuestas de navegación — solo ideas, nada implementado

Estado actual (`src/layouts/Layout.astro`): wordmark "FILMO" + 3 links de texto plano (Search, My Filmographies, Watchlist) + toggle de tema + `UserMenu`, todo en una fila que en mobile hace wrap y deja el botón de login/avatar colgando en su propia línea. Funciona, pero no dice nada de la identidad del producto (un tracker de filmografías) y no hay indicador de página activa.

Ideas de más conservadora a más arriesgada. Ninguna es excluyente entre sí — varias combinan bien.

---

## 1. Pill nav con indicador deslizante (bajo riesgo, alto pulido)

Reemplazar los 3 links de texto por un control tipo segmented-control (iOS): un contenedor con fondo `muted`, y un "thumb" que se desliza entre Search / My Filmographies / Watchlist según la ruta activa. Con GSAP (ya en el stack, usado en `FollowedPeopleHero`) el thumb anima su posición con un `quickTo` en vez de saltar.

- **Por qué**: resuelve el problema real de "no sé en qué página estoy" sin rediseñar nada más. Encaja con la estética minimalista B/N ya establecida.
- **Costo**: bajo. Un componente nuevo, reutiliza patrones existentes (GSAP scoped context, Tailwind).
- **Riesgo**: casi nulo — no cambia information architecture, solo el treatment visual.

## 2. Nav con íconos en vez de texto

`Search` → lupa, `My Filmographies` → ícono de perfil/film-strip, `Watchlist` → el mismo `BookmarkIcon` que ya se usa en toda la app para "watchlist" (ya hay coherencia ahí para explotar). Texto como `sr-only` + tooltip on hover/focus.

- **Por qué**: "My Filmographies" es la etiqueta más larga de la nav y empuja todo lo demás en mobile. Íconos comprimen el header y se sienten más "app", menos "sitio web".
- **Costo**: bajo — `lucide-react` ya es dependencia.
- **Riesgo**: íconos sin label pueden ser ambiguos para un usuario nuevo — mitigable con tooltip + `aria-label`.

## 3. Bottom tab bar en mobile, nav normal en desktop

En viewports chicos, mover Search / My Filmographies / Watchlist a una barra fija abajo (como Instagram/Letterboxd mobile), con el header quedando solo con wordmark + avatar. En desktop, la nav de arriba sigue como está (o como la propuesta #1/#2).

- **Por qué**: en mobile el pulgar vive abajo de la pantalla, no arriba — es el patrón nativo de apps de consumo de contenido, y esta app se usa mucho desde el celular explorando actores. También resuelve de raíz el problema del wrap del login button.
- **Costo**: medio — dos layouts de nav condicionales, hay que cuidar que el bottom bar no tape contenido (padding-bottom en `<main>`) y accesibilidad de foco/tab order.
- **Riesgo**: medio — es el cambio de IA (información arquitectura) más "atrevido" de la lista, pero es un patrón muy probado, no experimental.

## 4. Header que se contrae al hacer scroll

El header full (wordmark + nav completa) solo se ve arriba del todo; al scrollear hacia abajo se colapsa a una versión compacta (solo wordmark + avatar, ícono de bookmark del watchlist como shortcut), y reaparece completo al scrollear hacia arriba. Común en apps de lectura/consumo (Medium, apps de streaming).

- **Por qué**: las páginas de filmografía y watchlist pueden ser largas (grids de muchas películas) — recuperar esos ~60px de header constante suma, sobre todo en mobile.
- **Costo**: medio — requiere un listener de scroll con dirección + debounce, y decidir qué queda visible en el estado compacto.
- **Riesgo**: bajo-medio — bien hecho es invisible; mal hecho (jank, flicker) se nota mucho. Vale la pena solo si se anima con cuidado (GSAP `ScrollTrigger` sería la herramienta natural, aunque hoy no está instalado — solo `gsap` core).

## 5. Command palette (⌘K) como navegación primaria

En vez de que "Search" sea un link a `/search`, un atajo de teclado (⌘K / Ctrl+K) abre un modal tipo Spotlight/Raycast que busca actores/directores Y navega a Filmographies/Watchlist/Home — todo desde un solo punto de entrada. El nav de arriba se reduce a wordmark + avatar; un botón discreto "⌘K Search" queda como trigger visible para quien no conoce el atajo.

- **Por qué**: search ya es _la_ acción central de la app (es literalmente el home para nuevos usuarios). Convertirla en el mecanismo de navegación entero, no solo una sección más, es coherente con lo que la app realmente es. Se siente "power user" / técnicamente pulido — encaja con el objetivo de "calidad de gran app" del proyecto.
- **Costo**: medio-alto — nuevo componente de modal + manejo de teclado global + debounce de búsqueda ya existe (reusable de `PersonSearch.tsx`).
- **Riesgo**: medio — es un patrón que algunos usuarios (sobre todo no-técnicos, y esta app es de uso familiar) pueden no descubrir sin el botón visible de apoyo. No debería ser el _único_ modo de buscar.

## 6. Marquee de posters como fondo del header

El header (o una franja delgada debajo de él) muestra un collage horizontal, sutil y desenfocado, de posters de las películas trending/seguidas — scrolleando lento en loop (`gsap.to(x, {repeat: -1, ease: "none"})`, patrón ya usado en `FollowedPeopleHero`). La nav en texto/íconos queda encima, con buen contraste.

- **Por qué**: le da personalidad de "cine" al chrome de la app sin depender de contenido dinámico pesado — es decorativo, no funcional, así que no compite con la legibilidad si se hace con opacidad baja.
- **Costo**: medio — reutiliza el patrón GSAP existente, pero hay que resolver contraste en light/dark mode y evitar que compita visualmente con el contenido real.
- **Riesgo**: medio-alto — es la propuesta más "diseño primero": si no se ejecuta con cuidado (blur, opacidad, contraste) puede sentirse ruidosa en vez de elegante. La que más se aleja del minimalismo B/N actual.

## 7. Dock de avatares de "seguidos" en la nav

Un pequeño dock horizontal (como el dock de macOS, o los stories de Instagram) con los avatares de las 5-6 personas seguidas más recientes, al lado de la nav — click directo a su filmografía sin pasar por `/filmographies`. El home hero (`FollowedPeopleHero`) ya tiene esta data lista.

- **Por qué**: para el usuario que ya tiene gente seguida, es el atajo más corto a lo que probablemente quiere hacer ("ver si hay algo nuevo de X"). Reduce clicks para el caso de uso más frecuente.
- **Costo**: medio — nuevo componente, requiere datos de `subscribeToFollowedPeople` disponibles en el layout global (hoy solo se cargan dentro de `Dashboard`), así que implica algo de replumbing de dónde vive ese estado.
- **Riesgo**: medio — con pocos seguidos se ve bien; hay que decidir qué pasa con 0 seguidos (¿ocultarlo?) y con muchos (¿scroll horizontal, "+N más"?).

## 8. Breadcrumb contextual en `/person/[id]`

Hoy `/person/[id]` no dice cómo llegaste ahí. Agregar un breadcrumb sutil arriba del header de la persona: `← Volver a {origen}` — "tu watchlist", "búsqueda", o el nombre de la persona seguida desde la que navegaste (via el mismo patrón que ya usa `WatchlistMovie.sourcePersonName`).

- **Por qué**: no es "navegación" en el sentido de menú, pero es la pieza de wayfinding que más falta hoy — technically no hay forma de volver a donde estabas sin el botón atrás del navegador.
- **Costo**: bajo-medio — requiere pasar el "origen" como query param o guardarlo en `sessionStorage` al navegar.
- **Riesgo**: bajo — es aditivo, no reemplaza nada existente.

---

## Si hay que elegir un combo por dónde empezar

**#2 (íconos) + #1 (pill indicador) + #8 (breadcrumb)** es el combo de menor riesgo/mayor impacto: resuelve los problemas reales de hoy (verbosidad, falta de estado activo, falta de wayfinding) sin tocar la arquitectura de información ni requerir nuevas dependencias.

**#3 (bottom tab bar mobile) + #5 (command palette)** es la apuesta más "de producto pulido" si se quiere una app que se sienta nativa — pero son los dos cambios de mayor alcance, mejor evaluarlos por separado y no en la misma iteración.
