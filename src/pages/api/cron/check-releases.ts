import type { APIRoute } from "astro";
import { getAdminDb } from "@/lib/firebase/admin";
import { getFilmography } from "@/lib/tmdb/movies";
import { TmdbError } from "@/lib/tmdb/client";
import { logApiError } from "@/lib/api";
import type { CreditDepartment } from "@/types/filmography";

export const prerender = false;

// Runs daily (see vercel.json) — a 2-day lookback window makes a single
// missed/late cron run harmless without needing separate "already checked"
// bookkeeping. The notification doc's deterministic id is what actually
// prevents duplicates (see below), not this window.
const WINDOW_DAYS = 2;

function isRecentRelease(
  releaseDate: string | null,
  todayIso: string,
): boolean {
  if (!releaseDate) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return releaseDate >= cutoffIso && releaseDate <= todayIso;
}

export const GET: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getAdminDb();
  const todayIso = new Date().toISOString().slice(0, 10);
  let notified = 0;
  let checked = 0;

  const usersSnap = await db.collection("users").get();

  for (const userDoc of usersSnap.docs) {
    const peopleSnap = await userDoc.ref.collection("followedPeople").get();

    for (const personDoc of peopleSnap.docs) {
      const person = personDoc.data() as {
        readonly name: string;
        readonly knownForDepartment: string | null;
      };
      const personId = Number(personDoc.id);
      const department: CreditDepartment =
        person.knownForDepartment === "Directing" ? "Directing" : "Acting";

      checked++;
      let movies;
      try {
        movies = await getFilmography(personId, department);
      } catch (e) {
        if (e instanceof TmdbError) {
          logApiError("cron-check-releases", e);
          continue;
        }
        throw e;
      }

      const recent = movies.filter((m) =>
        isRecentRelease(m.releaseDate, todayIso),
      );

      for (const movie of recent) {
        // Deterministic id doubles as the dedupe key — a movie/person pair
        // notifies at most once ever, `create()` fails silently (caught
        // below) on every re-run after the first.
        const notifId = `release-${personId}-${movie.tmdbMovieId}`;
        const ref = userDoc.ref.collection("notifications").doc(notifId);
        try {
          await ref.create({
            type: "new-release",
            movieId: movie.tmdbMovieId,
            movieTitle: movie.title,
            posterPath: movie.posterPath,
            personId,
            personName: person.name,
            releaseDate: movie.releaseDate,
            read: false,
            createdAt: new Date().toISOString(),
          });
          notified++;
        } catch {
          // Already notified for this person/movie — expected on re-runs.
        }
      }
    }
  }

  return new Response(JSON.stringify({ checked, notified }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
