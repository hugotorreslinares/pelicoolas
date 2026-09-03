import { createServer } from "node:http";

// Canned TMDB responses for the E2E core flow (search → follow → mark
// watched → see progress). Started as its own webServer entry in
// playwright.config.ts; the app is pointed at it via TMDB_API_BASE_URL so
// the suite never depends on the real TMDB API or spends its quota.

const PERSON_ID = 999001;
const MOVIE_ID = 999101;

const routes = {
  "/search/person": () => ({
    results: [
      {
        id: PERSON_ID,
        name: "Test Actor",
        profile_path: null,
        known_for_department: "Acting",
      },
    ],
  }),
  [`/person/${PERSON_ID}`]: () => ({
    id: PERSON_ID,
    name: "Test Actor",
    profile_path: null,
    known_for_department: "Acting",
    biography: "A fixture actor for E2E tests.",
    gender: 2,
    birthday: "1980-01-01",
    deathday: null,
    place_of_birth: "Testville",
    also_known_as: [],
  }),
  [`/person/${PERSON_ID}/combined_credits`]: () => ({
    cast: [
      {
        id: MOVIE_ID,
        title: "Test Movie",
        poster_path: null,
        release_date: "2001-01-01",
        character: "Lead",
        media_type: "movie",
        vote_average: 7.5,
      },
    ],
    crew: [],
  }),
  [`/person/${PERSON_ID}/images`]: () => ({ profiles: [] }),
  [`/movie/${MOVIE_ID}`]: () => ({
    id: MOVIE_ID,
    title: "Test Movie",
    poster_path: null,
    release_date: "2001-01-01",
    overview: "A fixture movie for E2E tests.",
    runtime: 100,
    genres: [{ id: 1, name: "Drama" }],
  }),
};

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const handler = routes[url.pathname];
  res.setHeader("content-type", "application/json");
  if (!handler) {
    res.statusCode = 404;
    res.end(
      JSON.stringify({
        status_message: "not in fixtures",
        pathname: url.pathname,
      }),
    );
    return;
  }
  res.statusCode = 200;
  res.end(JSON.stringify(handler()));
});

const port = Number(process.env.PORT ?? 4400);
server.listen(port, () => {
  console.log(`mock TMDB server listening on ${port}`);
});
