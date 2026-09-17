import type { APIRoute } from "astro";
import { ImageResponse } from "@vercel/og";
import { getAdminDb } from "@/lib/firebase/admin";
import type { PublicProfile } from "@/types/user";

export const prerender = false;

const WIDTH = 1200;
const HEIGHT = 630;
const CACHE_SECONDS = 60 * 60; // 1h — profile stats/photo change rarely enough that a stale hour is fine

let interRegular: ArrayBuffer | null = null;
let interBold: ArrayBuffer | null = null;

// Satori (what ImageResponse renders with) needs an explicit font with the
// glyphs it draws — the default has no support for Spanish diacritics
// (ñ, á, é...), which silently render as tofu boxes. Fetched once per
// serverless instance and reused across requests.
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
// transform available here. `key` is required for the ImageResponse type
// even though satori itself ignores it.
function el(type: string, props: Record<string, unknown>, children?: unknown) {
  return { type, key: null, props: { ...props, children } };
}

export const GET: APIRoute = async ({ params }) => {
  const userId = params.userId;
  if (!userId) return new Response("Not found", { status: 404 });

  let profile: PublicProfile | null;
  let watchedCount = 0;
  try {
    const db = getAdminDb();
    const [snap, seenCount] = await Promise.all([
      db.doc(`users/${userId}`).get(),
      db.collection(`users/${userId}/seen`).count().get(),
    ]);
    profile = snap.exists ? (snap.data() as PublicProfile) : null;
    watchedCount = seenCount.data().count;
  } catch {
    profile = null;
  }

  const name = profile?.displayName ?? profile?.username ?? "Pelicoolas user";
  const initial = name.slice(0, 1).toUpperCase();
  const { interRegular, interBold } = await loadFonts();

  const avatar = el(
    "div",
    {
      style: {
        display: "flex",
        width: 168,
        height: 168,
        borderRadius: "50%",
        overflow: "hidden",
        border: "4px solid #f59e0b",
        backgroundColor: "#3f3f46",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 72,
        fontWeight: 700,
        color: "#f4f4f5",
      },
    },
    profile?.photoURL
      ? el("img", {
          src: profile.photoURL,
          width: 168,
          height: 168,
          style: { objectFit: "cover" },
        })
      : initial,
  );

  const nameEl = el(
    "div",
    { style: { fontSize: 56, fontWeight: 700, color: "#fafafa" } },
    name,
  );

  const taglineEl = el(
    "div",
    {
      style: {
        fontSize: 28,
        color: "#d4d4d8",
        display: "flex",
        alignItems: "center",
        gap: 10,
      },
    },
    watchedCount > 0
      ? `🎬 ${watchedCount} movies watched on Pelicoolas`
      : "🎬 Pelicoolas",
  );

  const root = el(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        backgroundColor: "#18181b",
        backgroundImage:
          "radial-gradient(circle at 20% 20%, #3f3f46 0%, #18181b 55%)",
        fontFamily: "Inter",
      },
    },
    [avatar, nameEl, taglineEl],
  );

  return new ImageResponse(root as never, {
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
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate`,
    },
  });
};
