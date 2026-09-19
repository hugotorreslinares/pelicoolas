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
    movieMap: "Movie Map",
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
    emptyFavorites: "No favorite movies yet.",
    emptyWatched: "No watched movies yet.",
    emptyWatchlist: "This watchlist is empty.",
    couldntLoad: "Couldn't load this profile.",
    couldntFollow: "Couldn't follow this user. Please try again.",
    couldntUnfollow: "Couldn't unfollow this user. Please try again.",
    retry: "Retry",
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
  search: {
    actorsDirectors: "Actors & directors",
    movies: "Movies",
    tvShows: "TV shows",
    somethingWentWrong: "Something went wrong. Please try again.",
    searchPlaceholderPerson: "Search actor or director...",
    searchPlaceholderAll: "Search actors, directors, movies, TV shows...",
    searchAriaAll: "Search actors, directors, movies, TV shows",
    searchAria: "Search",
    closeSearch: "Close search",
    noPeopleFound: "No people found. Try another name.",
    noPeopleFoundShort: "No people found.",
    noMoviesFoundShort: "No movies found.",
    noShowsFoundShort: "No TV shows found.",
    noMoviesFound: "No movies found. Try another title.",
    noShowsFound: "No shows found. Try another title.",
    couldntLoadPerson: "We couldn't load this filmography. Please try again.",
    couldntLoadMovies: "We couldn't load movies. Please try again.",
    couldntLoadShows: "We couldn't load shows. Please try again.",
    searchMovieTitle: "Search movie title...",
    searchTVTitle: "Search TV show title...",
    trendingThisWeek: "Trending this week",
    recentSearches: "Recent searches",
    removeFromRecent: (name: string) => `Remove ${name} from recent searches`,
    removedFromRecent: (name: string) => `Removed ${name} from recent searches`,
    removeFromRecentTooltip: "Remove from recent searches",
    people: (count: number, loading: boolean) =>
      `People${loading ? "" : ` (${count})`}`,
    moviesTab: (count: number, loading: boolean) =>
      `Movies${loading ? "" : ` (${count})`}`,
    tvTab: (count: number, loading: boolean) =>
      `TV${loading ? "" : ` (${count})`}`,
    noUsersFound: "No users found.",
    searchUsersAria: "Search users by username",
    searchUsersPlaceholder: "Find friends by username…",
    sent: "Sent",
    invite: "Invite",
    couldntSendInvite: "Couldn't send the invite. Please try again.",
    inviteSentTo: (username: string) => `Invite sent to @${username}`,
    pageHeading: "Search actors, directors, movies & TV shows",
  },
  friends: {
    followRequests: (count: number) => `Follow requests (${count})`,
    deny: "Deny",
    approve: "Approve",
    nowFriends: (name: string) => `You and ${name} are now friends`,
    couldntApprove: "Couldn't approve this request. Please try again.",
    denied: (name: string) => `Denied ${name}`,
    couldntDeny: "Couldn't deny this request. Please try again.",
    thisUser: "this user",
    pelicoolasUser: "Pelicoolas user",
  },
  invite: {
    invalidEmail: "Enter a valid email address.",
    couldntSend: "Couldn't send the invite.",
    couldntSendRetry: "Couldn't send the invite. Please try again.",
    inviteSentTo: (email: string) => `Invite sent to ${email}`,
    title: "Invite a friend",
    description: "Send an email invite to join Pelicoolas.",
    emailPlaceholder: "friend@example.com",
    messagePlaceholder: "Add a personal message (optional)",
    sending: "Sending…",
    sendInvite: "Send invite",
    sentInvites: "Sent invites",
    joined: "Joined ✓",
    sent: "Sent",
  },
  followedPerson: {
    yearsOld: (age: number) => `${age} years old`,
    filmographyComplete: "Filmography complete",
    complete: "Complete",
    moviesToComplete: (remaining: number) =>
      `${remaining} movies to complete this filmography`,
    toGo: (remaining: number) => `${remaining} to go`,
    remaining: (watched: number, total: number, remaining: number) =>
      `${watched} / ${total} · ${remaining} remaining`,
  },
  personHeader: {
    viewPhotosOf: (name: string) => `View photos of ${name}`,
    female: "Female",
    male: "Male",
    nonBinary: "Non-binary",
    gender: "Gender",
    birthdayDeathday: "Birthday — Deathday",
    birthday: "Birthday",
    yearsOldRange: (start: string, end: string, age: number) =>
      `${start} — ${end} (${age} years old)`,
    yearsOldSingle: (date: string, age: number) => `${date} (${age} years old)`,
    placeOfBirth: "Place of Birth",
    knownFor: "Known For",
    knownCredits: "Known Credits",
    alsoKnownAs: "Also known as:",
    couldntLoadPhotos: "We couldn't load these photos. Please try again.",
    noPhotosAvailable: "No photos available.",
  },
  board: {
    yourRecommendations: "Your recommendations",
    movieRecommendations: "Movie recommendations",
    ownerSubtitle:
      "Anyone with this link can see this board, no account needed.",
    visitorSubtitle: "Movies worth watching, picked by a Pelicoolas user.",
    copied: "Copied!",
    copyLinkToShare: "Copy link to share",
    linkCopied: "Link copied",
    removed: (title: string) => `Removed ${title}`,
    couldntRemove: (title: string) =>
      `Couldn't remove "${title}". Please try again.`,
    recommendations: (count: number | null) =>
      `Recommendations${count !== null ? ` (${count})` : ""}`,
    emptyOwner:
      "Nothing here yet — open any movie and tap the star to recommend it.",
    emptyVisitor: "This board is empty for now.",
    trackYourOwn:
      "Track your own filmographies and build a board like this one.",
    tryPelicoolas: "Try Pelicoolas",
    viewDetailsFor: (title: string) => `View details for ${title}`,
    noPoster: "No poster",
    unknown: "Unknown",
    removeFrom: (title: string) => `Remove ${title} from your recommendations`,
    removeFromRecommendations: "Remove from recommendations",
  },
  connections: {
    heading: "Connections",
    subtitle:
      "How the people you follow — and the movies they're in — overlap.",
    tabPeople: "People who worked together",
    tabCast: "Shared cast",
    tabMap: "Movie map",
    signInPrompt: "Sign in to see how your filmographies connect.",
    followSomePeople:
      "Follow a few actors or directors to see how their movies connect.",
    searchActorsDirectors: "Search actors & directors",
    noOverlapsYet:
      "No overlaps yet — the people you follow haven't shared a movie (that's in their tracked filmography).",
    scanDescription:
      "Checks the full cast of every movie in your filmography for actors who show up more than once — not just the people you follow.",
    limitedToFirst: (max: number) => ` Limited to the first ${max} movies.`,
    scanning: (progress: number, total: number) =>
      `Scanning ${progress}/${total}…`,
    rescan: "Re-scan",
    findSharedActors: "Find shared actors",
    noSharedActor: "No actor appears in more than one of these movies.",
    movies: (count: number) => `— ${count} movies`,
    exploreNeighborhood: "Explore any movie's neighborhood — inspired by",
    withPostersLayout: ", with posters, live layout, and pan/zoom.",
    viewDetailsFor: (title: string) => `View details for ${title}`,
    noPoster: "No poster",
    unknown: "Unknown",
  },
  movieMap: {
    resetMap: "Reset map",
    addAnotherMovie: "Add another movie…",
    searchToStart: "Search a movie to start…",
    loading: "Loading",
    view: (title: string) => `View ${title}`,
    searchAbove:
      "Search a movie above to map out what's similar to it. Click any result on the map to pull in its own similar movies too — the map keeps growing, nothing gets replaced.",
    scrollToZoom:
      "Scroll to zoom, drag to pan. Click a poster to pull in what's similar to it — the highlighted one is your current focus.",
    atSizeLimit: " Map is at its size limit.",
    viewDetailsFor: (title: string) => `View details for ${title}`,
    viewDetails: "View details",
  },
  usernamePrompt: {
    invalidUsername: "3-20 characters: letters, numbers, underscore.",
    usernameTaken: "That username is taken. Try another.",
    pickUsername: "Pick a username",
    description: "So friends can find you and send you a follow request.",
    placeholder: "username",
    ariaLabel: "Username",
    checking: "Checking…",
    continue: "Continue",
  },
  badge: {
    couldntRender: "Couldn't render this badge. Please try again.",
    shared: (label: string) => `Shared "${label}" badge`,
    couldntShare: "Couldn't share this badge. Please try again.",
    downloaded: (label: string) => `Downloaded "${label}" badge`,
    download: "Download",
    sharing: "Sharing…",
    share: "Share",
    shareBadge: (label: string) => `Share "${label}" badge`,
    shareBadgeTooltip: "Share badge",
    badgeAlt: (label: string) => `"${label}" badge`,
  },
  people: {
    discover: "Discover",
    following: "Following",
    followers: "Followers",
    tabsLabel: "People",
    signInPrompt: "Sign in to see who you follow and who follows you.",
    discoverHeading: "Discover people",
    newOnPelicoolas: "New on Pelicoolas",
    emptyDiscover: "No one to show yet. Try searching by username.",
    emptyFollowing: "You're not following anyone yet.",
    emptyFollowingCta: "Discover people",
    emptyFollowers: "No followers yet.",
    emptyFollowersCta: "Share my profile",
    couldntLoad: "Couldn't load people.",
    retry: "Retry",
    searching: "Searching…",
    couldntSearch: "Couldn't search users. Please try again.",
  },
  cards: {
    viewDetailsFor: (title: string) => `View details for ${title}`,
    noPoster: "No poster",
    releaseUnknown: "Release date: Unknown",
    goToFilmography: (name: string) => `Go to ${name}'s filmography`,
    goToSlide: (index: number, total: number) =>
      `Go to slide ${index} of ${total}`,
    scrollLeft: "Scroll left",
    scrollRight: "Scroll right",
    unknownYear: "Unknown",
    notInFollowed: "Not part of a followed filmography",
    removedFromWatchlist: (title: string) => `Removed ${title} from watchlist`,
  },
  heroes: {
    welcomeBody:
      "Follow your favorite actors and directors, track what you've already watched, and never miss what they release next.",
    searchActorsDirectors: "Search actors & directors",
    findFriendsTitle: "Find your friends",
    findFriendsBody:
      "Search by username, send a follow request, and see what they're watching, adding, and recommending.",
    findFriendsCta: "Find friends",
    newOnPelicoolas: "New on Pelicoolas",
  },
  friendsPage: {
    heading: "Friends",
    signInPrompt: "Sign in to see what the people you follow are watching.",
    notFollowingYet:
      "You're not following anyone yet. Search for a friend's username above, or ask them for their profile link.",
    myProfile: "My profile",
    noActivity: "No activity yet.",
    watched: "Watched",
    addedToWatchlist: "Added to watchlist",
    recommended: "Recommended",
  },
  movie: {
    markWatched: "Mark as watched",
    alreadyWatched: "Already watched",
    addToWatchlist: "Add to watchlist",
    inWatchlist: "In watchlist",
    recommendThis: "Recommend this movie",
    removeFromRecommendations: "Remove from recommendations",
    addToBoardAria: (title: string) =>
      `Add ${title} to your recommendations board`,
    removeFromBoardAria: (title: string) =>
      `Remove ${title} from your recommendations board`,
    boardChanged: (title: string, added: boolean) =>
      `${added ? "Added" : "Removed"} ${title} ${added ? "to" : "from"} your recommendations board`,
    couldntUpdate: (title: string) =>
      `Couldn't update "${title}". Please try again.`,
    unknown: "Unknown",
    minutes: (count: number) => `${count} min`,
    seasons: (count: number) =>
      `${count} ${count === 1 ? "season" : "seasons"}`,
    couldntLoadShow: "We couldn't load this show. Please try again.",
    couldntLoadMovie: "We couldn't load this movie. Please try again.",
    close: "Close",
    signInToTrack: (tv: boolean) =>
      `to track, save, or recommend ${tv ? "shows" : "movies"}`,
    viewInMovieMap: "View in Movie Map",
    noOverview: "No overview available.",
    cast: "Cast",
    whereToWatch: "Where to watch",
    stream: "Stream",
    rent: "Rent",
    buy: "Buy",
    justWatchNote:
      "Streaming availability via JustWatch, may not be complete or 100% accurate.",
  },
  followPerson: {
    now: (name: string) => `Now following ${name}`,
    unfollowed: (name: string) => `Unfollowed ${name}`,
    following: "✓ Following",
    follow: "+ Follow",
  },
  badges: {
    personComplete: (name: string) => `Completed ${name}`,
    personCompleteDesc: (name: string) =>
      `Watched all the movies in ${name}'s filmography.`,
    filmographyMilestone: (n: number) => `${n} Filmographies Complete`,
    filmographyMilestoneDesc: (n: number) =>
      `Completed ${n} followed filmographies.`,
    leadingRole: "Leading Role",
    leadingRoleDesc: "Completed your first actor's filmography.",
    directorsCut: "Director's Cut",
    directorsCutDesc: "Completed your first director's filmography.",
    watchlistMilestone: (n: number) => `Watchlist of ${n}+`,
    watchlistMilestoneDesc: (n: number) =>
      `Kept ${n} or more movies on your watchlist.`,
    fullRetrospective: (name: string) => `${name}: Full Retrospective`,
    fullRetrospectiveDesc: (name: string) =>
      `Watched ${name}'s movies across many different decades.`,
    halloweenMarathon: "Halloween Marathon",
    halloweenMarathonDesc: "Watched all 31 horror movies before October 31.",
  },
  halloween: {
    heroTitle: "31 horror movies before October 31",
    heroBody:
      "Build your Halloween list, watch one a day, and earn the Halloween Marathon badge.",
    heroCta: "Build my list",
    heading: "Halloween challenge",
    subtitle: "31 horror movies to watch before October 31.",
    daysLeft: (n: number) => `${n} ${n === 1 ? "day" : "days"} left`,
    signInPrompt: "Sign in to build your Halloween list.",
    pickTitle: "Pick your 31",
    pickBody:
      "We picked the best-known horror you haven't seen yet. Swap any of them.",
    selected: (n: number, total: number) => `${n}/${total} selected`,
    save: "Save my list",
    saving: "Saving…",
    saved: "List saved",
    couldntSave: "Couldn't save your list. Please try again.",
    couldntLoad: "Couldn't load horror movies.",
    retry: "Retry",
    edit: "Edit list",
    cancel: "Cancel",
    progress: (watched: number, total: number) => `${watched}/${total} watched`,
    complete: "Challenge complete — you earned the Halloween Marathon badge!",
    tooMany: (total: number) => `Pick at most ${total}.`,
    select: (title: string) => `Select ${title}`,
    deselect: (title: string) => `Remove ${title} from the list`,
  },
  growth: {
    shareMyProfile: "Share my profile",
    shareTitle: "My Pelicoolas profile",
    shareText:
      "Check out what I've watched on Pelicoolas — follow me to compare our taste in movies.",
    linkCopied: "Link copied",
    couldntShare: "Couldn't share your profile. Please try again.",
    invitePromptTitle: "Enjoying Pelicoolas?",
    invitePromptBody:
      "Invite a friend to follow you — you'll see how your taste in movies compares.",
    invitePromptCta: "Invite a friend",
    invitePromptDismiss: "Not now",
  },
};

export type Dictionary = typeof en;
