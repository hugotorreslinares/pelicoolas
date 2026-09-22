// TMDB's genre list (GET /genre/movie/list) is small and effectively
// static — hardcoded instead of an extra fetch+cache layer for 19 values
// that rarely change. https://developer.themoviedb.org/reference/genre-movie-list
export const TMDB_MOVIE_GENRES: Readonly<Record<number, string>> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

// TV-only ids (GET /genre/tv/list) — omits ids that overlap with the movie
// list above (Animation 16, Comedy 35, Crime 80, Documentary 99, Drama 18,
// Family 10751, Mystery 9648, Western 37): TMDB gives those the same name
// in both namespaces, so genreName() below can look them up from either
// map without a collision.
const TMDB_TV_ONLY_GENRES: Readonly<Record<number, string>> = {
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

export function genreName(id: number): string | undefined {
  return TMDB_MOVIE_GENRES[id] ?? TMDB_TV_ONLY_GENRES[id];
}
