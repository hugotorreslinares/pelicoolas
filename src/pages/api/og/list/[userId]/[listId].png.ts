import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getListSummary } from "@/lib/listSummary";

export const prerender = false;

const WIDTH = 1200;
const HEIGHT = 630;
const CACHE_SECONDS = 60 * 60; // 1h — same staleness budget as the profile OG image

let interRegular: ArrayBuffer | null = null;
let interBold: ArrayBuffer | null = null;

// satori needs an explicit font with the glyphs it draws — without one,
// Spanish diacritics (ñ, á, é...) silently render as tofu boxes. Fetched
// once per serverless instance and reused across requests.
async function loadFonts() {
  if (!interRegular || !interBold) {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap",
    ).then((r) => r.text());
    const urls = [
      ...css.matchAll(/src: url\(([^)]+)\) format\('truetype'\)/g),
    ].map((m) => m[1]);
    const [regular, bold] = await Promise.all(
      urls.map((u) => fetch(u).then((r) => r.arrayBuffer())),
    );
    interRegular = regular;
    interBold = bold;
  }
  return { interRegular, interBold };
}

// Plain satori-element tree, not JSX — API routes are .ts (Astro only
// treats .tsx files as page components, not endpoints), so there's no JSX
// transform available here.
function el(type: string, props: Record<string, unknown>, children?: unknown) {
  return { type, props: { ...props, children } };
}

export const GET: APIRoute = async ({ params }) => {
  const { userId, listId } = params;
  if (!userId || !listId) return new Response("Not found", { status: 404 });

  const { name, movieCount, posters } = await getListSummary(userId, listId);
  const title = name ?? "Movie list";
  const { interRegular, interBold } = await loadFonts();

  const nameEl = el(
    "div",
    { style: { fontSize: 56, fontWeight: 700, color: "#fafafa" } },
    title,
  );

  const countEl = el(
    "div",
    { style: { fontSize: 30, color: "#d4d4d8" } },
    `${movieCount} ${movieCount === 1 ? "movie" : "movies"}`,
  );

  const brand = el(
    "div",
    {
      style: {
        display: "flex",
        fontSize: 26,
        fontWeight: 700,
        color: "#18181b",
        backgroundColor: "#f59e0b",
        borderRadius: 999,
        padding: "10px 24px",
      },
    },
    "pelicoolas.com",
  );

  const posterEls = posters
    .filter((p) => p.posterPath)
    .map((p) =>
      el("img", {
        src: `https://image.tmdb.org/t/p/w342${p.posterPath}`,
        width: 200,
        height: 300,
        style: { borderRadius: 14, objectFit: "cover" },
      }),
    );

  const info = el(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: posterEls.length > 0 ? "flex-start" : "center",
        gap: 18,
        maxWidth: 480,
      },
    },
    [nameEl, countEl, brand],
  );

  const root = el(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 72,
        backgroundColor: "#18181b",
        backgroundImage:
          "radial-gradient(circle at 20% 20%, #3f3f46 0%, #18181b 55%)",
        fontFamily: "Inter",
      },
    },
    posterEls.length > 0
      ? [info, el("div", { style: { display: "flex", gap: 16 } }, posterEls)]
      : info,
  );

  const svg = await satori(root as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      ...(interRegular
        ? [{ name: "Inter", data: interRegular, weight: 400 as const }]
        : []),
      ...(interBold
        ? [{ name: "Inter", data: interBold, weight: 700 as const }]
        : []),
    ],
  });

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate`,
    },
  });
};
