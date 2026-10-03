import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getMovieDetails } from "@/lib/tmdb/movies";
import { getTVDetails } from "@/lib/tmdb/tv";
import { loadInter, loadLimelight } from "@/lib/ogFonts";

export const prerender = false;

const WIDTH = 1200;
const HEIGHT = 630;
const CACHE_SECONDS = 60 * 60 * 24;
const REGION = "US"; // only needed to satisfy the details call; no providers drawn

// Plain satori-element tree, not JSX — API routes are .ts files.
function el(type: string, props: Record<string, unknown>, children?: unknown) {
  return { type, props: { ...props, children } };
}

interface CardData {
  readonly title: string;
  readonly posterPath: string | null;
  readonly backdropPath: string | null;
  readonly facts: string;
  readonly rating: number | null;
}

async function loadCard(type: string, id: number): Promise<CardData | null> {
  try {
    if (type === "movie") {
      const m = await getMovieDetails(id, REGION);
      return {
        title: m.title,
        posterPath: m.posterPath,
        backdropPath: m.backdropPath,
        facts: [
          m.releaseYear,
          m.runtimeMinutes ? `${m.runtimeMinutes} min` : null,
          m.genres.slice(0, 2).join(", ") || null,
        ]
          .filter(Boolean)
          .join(" · "),
        rating: m.voteAverage,
      };
    }
    const s = await getTVDetails(id, REGION);
    return {
      title: s.title,
      posterPath: s.posterPath,
      backdropPath: s.backdropPath,
      facts: [
        s.releaseYear,
        s.seasonCount
          ? `${s.seasonCount} ${s.seasonCount === 1 ? "season" : "seasons"}`
          : null,
        s.genres.slice(0, 2).join(", ") || null,
      ]
        .filter(Boolean)
        .join(" · "),
      rating: s.voteAverage,
    };
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ params }) => {
  const { type, id } = params;
  const numericId = Number(id);
  if ((type !== "movie" && type !== "tv") || !Number.isInteger(numericId)) {
    return new Response("Not found", { status: 404 });
  }

  const card = await loadCard(type, numericId);
  if (!card) return new Response("Not found", { status: 404 });

  const [fonts, brandFont] = await Promise.all([loadInter(), loadLimelight()]);
  const title =
    card.title.length > 60
      ? `${card.title.slice(0, 59).trimEnd()}…`
      : card.title;

  const poster = card.posterPath
    ? el("img", {
        src: `https://image.tmdb.org/t/p/w500${card.posterPath}`,
        width: 280,
        height: 420,
        style: {
          borderRadius: 16,
          objectFit: "cover",
          border: "2px solid rgba(255,255,255,0.15)",
        },
      })
    : null;

  const ratingPill =
    card.rating !== null && card.rating > 0
      ? el(
          "div",
          {
            style: {
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              color: "#18181b",
              backgroundColor: "#f59e0b",
              borderRadius: 999,
              padding: "6px 22px",
            },
          },
          `${Math.round(card.rating * 10)}%`,
        )
      : null;

  const info = el(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 20,
        flex: 1,
        justifyContent: "center",
      },
    },
    [
      el(
        "div",
        {
          style: {
            fontSize: 64,
            fontWeight: 700,
            color: "#fafafa",
            lineHeight: 1.1,
          },
        },
        title,
      ),
      card.facts
        ? el("div", { style: { fontSize: 30, color: "#d4d4d8" } }, card.facts)
        : null,
      ratingPill ? el("div", { style: { display: "flex" } }, ratingPill) : null,
    ].filter(Boolean),
  );

  const wordmark = el(
    "div",
    {
      style: {
        position: "absolute",
        left: 60,
        bottom: 40,
        display: "flex",
        alignItems: "baseline",
        gap: 16,
      },
    },
    [
      el(
        "div",
        {
          style: {
            fontFamily: "Limelight",
            fontSize: 40,
            color: "#fda000",
            letterSpacing: 2,
          },
        },
        "PELICOOLAS",
      ),
      el(
        "div",
        { style: { fontSize: 22, color: "#a1a1aa" } },
        "pelicoolas.com",
      ),
    ],
  );

  const backdrop = card.backdropPath
    ? el("img", {
        src: `https://image.tmdb.org/t/p/w1280${card.backdropPath}`,
        width: WIDTH,
        height: HEIGHT,
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          objectFit: "cover",
        },
      })
    : null;

  const overlay = el("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      width: WIDTH,
      height: HEIGHT,
      backgroundImage: card.backdropPath
        ? "linear-gradient(90deg, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.8) 55%, rgba(10,10,10,0.55) 100%)"
        : "radial-gradient(circle at 20% 20%, #3f3f46 0%, #18181b 55%)",
      ...(card.backdropPath ? {} : { backgroundColor: "#18181b" }),
    },
  });

  const root = el(
    "div",
    {
      style: {
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#18181b",
        fontFamily: "Inter",
      },
    },
    [
      backdrop,
      overlay,
      el(
        "div",
        {
          style: {
            position: "absolute",
            top: 60,
            left: 60,
            right: 60,
            bottom: 110,
            display: "flex",
            alignItems: "center",
            gap: 56,
          },
        },
        [poster, info].filter(Boolean),
      ),
      wordmark,
    ].filter(Boolean),
  );

  const svg = await satori(root as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Inter", data: fonts.regular, weight: 400 as const },
      { name: "Inter", data: fonts.bold, weight: 700 as const },
      { name: "Limelight", data: brandFont, weight: 400 as const },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate`,
    },
  });
};
