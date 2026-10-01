import type { APIRoute } from "astro";
import { searchMovie } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";
import { errorResponse, jsonResponse, logApiError } from "@/lib/api";
import { isRateLimited } from "@/lib/rateLimit";
import { mapWithConcurrency } from "@/lib/concurrency";
import type { TrendingMovie } from "@/types/movie";

export const prerender = false;

const MAX_ROWS = 500;
const CONCURRENCY = 5;
const DAILY_LIMIT_PER_USER = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

interface ImportRowInput {
  readonly title: string;
  readonly year: number | null;
}

interface MatchResult {
  readonly title: string;
  readonly year: number | null;
  readonly match: TrendingMovie | null;
}

function pickBest(
  results: readonly TrendingMovie[],
  year: number | null,
): TrendingMovie | null {
  if (year !== null) {
    const exact = results.find((r) => r.releaseYear === year);
    if (exact) return exact;
  }
  return results[0] ?? null;
}

export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!token) return errorResponse("Missing Authorization header", 401);

  let uid: string;
  try {
    uid = (await verifyFirebaseIdToken(token)).uid;
  } catch {
    return errorResponse("Invalid or expired session", 401);
  }

  if (isRateLimited(`import:${uid}`, DAILY_LIMIT_PER_USER, DAY_MS)) {
    return errorResponse(
      "You've reached today's import limit. Try again tomorrow.",
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  const rawRows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return errorResponse("Missing rows", 400);
  }
  const rows: ImportRowInput[] = rawRows
    .slice(0, MAX_ROWS)
    .filter(
      (r): r is ImportRowInput =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as { title?: unknown }).title === "string",
    )
    .map((r) => ({
      title: r.title,
      year: typeof r.year === "number" ? r.year : null,
    }));

  const matches: MatchResult[] = new Array(rows.length);
  try {
    await mapWithConcurrency(
      rows.map((row, index) => ({ row, index })),
      CONCURRENCY,
      async ({ row, index }) => {
        try {
          const results = await searchMovie(row.title);
          matches[index] = { ...row, match: pickBest(results, row.year) };
        } catch (error) {
          if (error instanceof TmdbError) {
            matches[index] = { ...row, match: null };
          } else {
            throw error;
          }
        }
      },
    );
    return jsonResponse({ matches });
  } catch (error) {
    logApiError("import-match", error);
    return errorResponse("Couldn't match your movies", 500);
  }
};
