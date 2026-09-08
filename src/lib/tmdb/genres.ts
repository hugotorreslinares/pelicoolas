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

export function genreName(id: number): string | undefined {
  return TMDB_MOVIE_GENRES[id];
}
