import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getProfileSummary } from "@/lib/profileSummary";

export const prerender = false;

const WIDTH = 1200;
const HEIGHT = 630;
const CACHE_SECONDS = 60 * 60; // 1h — profile stats/photo change rarely enough that a stale hour is fine

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
  const userId = params.userId;
  if (!userId) return new Response("Not found", { status: 404 });

  const { profile, watchedCount, favorites, topGenre } =
    await getProfileSummary(userId);

  const name = profile?.displayName ?? profile?.username ?? "Pelicoolas user";
  const initial = name.slice(0, 1).toUpperCase();
  const { interRegular, interBold } = await loadFonts();

  // satori's own <img> support fetches the src at render time — no need to
  // inline it as a data URI first.
  const avatar = el(
    "div",
    {
      style: {
        display: "flex",
        width: 140,
        height: 140,
        borderRadius: "50%",
        overflow: "hidden",
        border: "4px solid #f59e0b",
        backgroundColor: "#3f3f46",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 60,
        fontWeight: 700,
        color: "#f4f4f5",
      },
    },
    profile?.photoURL
      ? el("img", {
          src: profile.photoURL,
          width: 140,
          height: 140,
          style: { objectFit: "cover" },
        })
      : initial,
  );

  const nameEl = el(
    "div",
    { style: { fontSize: 52, fontWeight: 700, color: "#fafafa" } },
    name,
  );

  const stat = (text: string) =>
    el("div", { style: { fontSize: 30, color: "#d4d4d8" } }, text);
  const stats = [
    watchedCount > 0 ? `${watchedCount} movies watched` : null,
    topGenre ? `Favorite genre: ${topGenre}` : null,
  ].filter((t): t is string => t !== null);

  const posters = favorites
    .filter((f) => f.posterPath)
    .map((f) =>
      el("img", {
        src: `https://image.tmdb.org/t/p/w342${f.posterPath}`,
        width: 200,
        height: 300,
        style: { borderRadius: 14, objectFit: "cover" },
      }),
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

  const info = el(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: posters.length > 0 ? "flex-start" : "center",
        gap: 18,
        maxWidth: 480,
      },
    },
    [avatar, nameEl, ...stats.map(stat), brand],
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
    posters.length > 0
      ? [info, el("div", { style: { display: "flex", gap: 16 } }, posters)]
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
