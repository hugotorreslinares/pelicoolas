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
};

export type Dictionary = typeof en;
