/**
 * English dictionary — the shape source of truth. `es.ts` is typed against
 * `Dictionary` (derived below), so a missing/extra key or a mismatched
 * interpolation-function signature is a type error at build time, not a
 * runtime surprise — no separate parity test needed.
 */

interface Slide {
  readonly kicker: string;
  readonly title: string;
  readonly description: string;
}

/** Fixed-length tuple (not `readonly Slide[]`) so `es.ts` must supply exactly the same number of slides — a length mismatch is a type error. */
type Slides = readonly [Slide, Slide, Slide, Slide];

interface Feature {
  readonly title: string;
  readonly description: string;
}

/** Fixed-length tuple, same reasoning as Slides above. */
type Features = readonly [Feature, Feature, Feature, Feature];

// No `as const` here — leaf strings must widen to `string` (not literal
// types) so es.ts can hold different text while still satisfying
// `Dictionary`'s shape (keys, nesting, interpolation-function signatures).
export const en = {
  nav: {
    search: "Search",
    myFilmographies: "My Filmographies",
    watched: "Watched",
    watchlist: "Watchlist",
    connections: "Connections",
    friends: "Friends",
    menu: "Menu",
  },
  account: {
    toggleTheme: "Toggle theme",
    accountMenu: (followerCount: number) =>
      `Account menu — ${followerCount} ${followerCount === 1 ? "follower" : "followers"}`,
    myProfile: "My profile",
    myBoard: "My recommendations board",
    inviteFriend: "Invite a friend",
    exportData: "Export data",
    exporting: "Exporting…",
    signOut: "Sign out",
    continueWithGoogle: "Continue with Google",
    exportDownloaded: "Export downloaded",
    exportFailed: "Couldn't export your data. Please try again.",
  },
  footer: {
    tmdbAttribution:
      "This product uses the TMDB API but is not endorsed or certified by TMDB.",
    privacyLink: "Privacy & Data Policy",
    copyright: (year: number) => `© ${year} Pelicoolas`,
    deployed: (date: string) => `Deployed ${date}`,
  },
  onboarding: {
    progressLabel: "Progress",
    next: "Next",
    continue: "Continue",
    slides: [
      {
        kicker: "Pelicoolas",
        title:
          "How many of your favorite actor's movies have you actually seen?",
        description:
          "Follow the actors and directors you like, check off what you've watched, and discover what you're missing.",
      },
      {
        kicker: "Filmographies",
        title: "Follow actors and directors. Check off what you've watched.",
        description:
          "Every person you follow has their own progress — you know exactly how much is left to complete their filmography.",
      },
      {
        kicker: "Watchlist & badges",
        title: "Save what you want to see. Unlock badges.",
        description:
          "Your personal watchlist, and a reward every time you complete someone's filmography.",
      },
      {
        kicker: "Start for free",
        title: "Your movie progress, always visible.",
        description:
          "No feeds, no noise. Just you, your filmographies, and what's left to watch.",
      },
    ] satisfies Slides,
  },
  locale: {
    switchLanguage: "Switch language",
  },
  common: {
    gridView: "Grid view",
    listView: "List view",
    copyLinkToShare: "Copy link to share",
    copied: "Copied!",
    search: "Search",
    noImage: "No image",
    nothingHereYet: "Nothing here yet.",
  },
  dashboard: {
    heading: "My Filmographies",
    features: [
      {
        title: "Filmographies",
        description:
          "Track movie-by-movie progress for every person you follow.",
      },
      {
        title: "Watchlist",
        description: "Save what you want to see, filterable by genre.",
      },
      {
        title: "Connections",
        description: "Explore how movies and people relate to each other.",
      },
      {
        title: "Badges",
        description: "Earn and share badges as you complete filmographies.",
      },
    ] satisfies Features,
    findPerson: "Find an actor or director whose movies you want to explore.",
    yourYearInFilm: "Your Year in Film",
    almostThere: "Almost there",
    moviesToComplete: (remaining: number) =>
      `— ${remaining} ${remaining === 1 ? "movie" : "movies"} to complete`,
    peopleFollowing: (count: number) => `${count} people you're following`,
    sortRecent: "Recently followed",
    sortAge: "Age",
    sortWatched: "Most watched",
    sortWatchlist: "Watchlist size",
    viewAll: (count: number) => `View all ${count}`,
    trendingMovies: "Trending Movies",
    trendingTV: "Trending TV Shows",
  },
  watched: {
    heading: "Watched",
    signInPrompt: "Sign in to see everything you've marked watched.",
    emptyHeading: "Nothing marked watched yet.",
    emptyBody:
      "Mark movies watched from a filmography, search, or the watchlist — they'll all show up here.",
    searchActorsDirectors: "Search actors & directors",
    allGenres: "All genres",
    otherGenre: "Other",
    byYear: "By year",
    byPerson: "By person",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
  },
  watchlist: {
    heading: "Watchlist",
    myWatchlist: "My Watchlist",
    signInPrompt: "Sign in to keep movies on your radar.",
    emptyHeading: "Your watchlist is empty.",
    emptyBody:
      "While exploring a filmography, tap the bookmark icon on a movie to add it here — or start from a followed person's page or a search result.",
    searchActorsDirectors: "Search actors & directors",
    myFilmographies: "My Filmographies",
    stats: (total: number, watched: number, toWatch: number) =>
      `${total} movies · ${watched} watched · ${toWatch} to watch`,
    pickForMe: "Pick something for me",
    pickForMeSubtitle: "Picks a random movie from your watchlist",
    filterAll: (count: number) => `All (${count})`,
    filterToWatch: (count: number) => `To watch (${count})`,
    filterWatched: (count: number) => `Watched (${count})`,
    sortBy: "Sort by",
    sortNewest: "Newest first",
    sortOldest: "Oldest first",
    sortRating: "Highest rated",
    sortAlphabetical: "A–Z",
    allGenres: "All genres",
    otherGenre: "Other",
    noMoviesMatch: "No movies match these filters.",
    markedWatched: (title: string, marked: boolean) =>
      `${marked ? "Marked" : "Unmarked"} ${title} as watched`,
    couldntUpdate: (title: string) =>
      `Couldn't update "${title}". Please try again.`,
  },
  filmography: {
    mostRecent: "Most recent",
    oldest: "Oldest",
    signInToTrack: "to track and save movies",
    markedWatched: (title: string, watched: boolean) =>
      `Marked ${title} as ${watched ? "watched" : "unwatched"}`,
    watchlistChanged: (title: string, added: boolean) =>
      `${added ? "Added" : "Removed"} ${title} ${added ? "to" : "from"} watchlist`,
    couldntUpdate: (title: string) =>
      `Couldn't update "${title}". Please try again.`,
    filterAll: "All",
    filterUnwatched: "Unwatched",
    filterWatched: "Watched",
  },
  profile: {
    pelicoolasUser: "Pelicoolas user",
    linkCopied: "Link copied",
    followRequestSent: "Follow request sent",
    unfollowed: (name: string) => `Unfollowed ${name}`,
    doesntExist: "This user doesn't exist or hasn't signed in yet.",
    copied: "Copied!",
    copyLinkToShare: "Copy link to share",
    following: "Following",
    requested: "Requested",
    requestToFollow: "Request to follow",
    favorites: "Favorites",
    watched: "Watched",
    watchlist: "Watchlist",
    theirLists: (name: string) => `${name}'s Lists`,
    privateListsLocked: (name: string) =>
      `${name}'s watched movies and watchlist are only visible to approved followers.`,
    thisUser: "this user",
    theirDefault: "Their",
  },
  identity: {
    cinematicIdentity: (name: string) => `${name}'s cinematic identity`,
    thisUser: "This user",
    watched: "watched",
    watchlist: "watchlist",
    favorites: "favorites",
    movieDNA: "Movie DNA",
    basedOnMovies: (count: number) => `Based on your ${count} movies`,
    seeAll: "See all",
    otherGenre: "Other",
  },
  peopleLikeYou: {
    heading: "People like you",
    pelicoolasUser: "Pelicoolas user",
  },
  compatibility: {
    tasteMatch: "Taste Match",
    basedOn: "Based on movies, genres and people you both follow",
    pickForUs: "Pick something for us",
    pickReasonGenre: "Picked from a genre you both love",
    pickReasonPerson: "Picked via someone you both follow",
    pickReasonRandom: "Picked from your shared watchlist",
    inCommon: "In Common",
    onBothWatchlists: "On both watchlists",
    bothWatched: "Movies & shows both watched",
    genresInCommon: "Genres in common",
    peopleInCommon: "Actors & directors both follow",
    otherGenre: "Other",
    thisUser: "this user",
    compatibilityWith: (name: string) => `Compatibility with ${name}`,
  },
};

export type Dictionary = typeof en;
