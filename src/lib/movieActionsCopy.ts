export function watchedLabel(watched: boolean): string {
  return watched ? "Already watched" : "Mark as watched";
}

export function watchlistLabel(inWatchlist: boolean): string {
  return inWatchlist ? "In watchlist" : "Add to watchlist";
}
