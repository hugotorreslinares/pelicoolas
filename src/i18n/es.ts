import type { Dictionary } from "./en";

// Typed against `Dictionary` — a missing key, extra key, or mismatched
// interpolation-function signature is a build-time type error here.
export const es: Dictionary = {
  nav: {
    search: "Buscar",
    myFilmographies: "Mis filmografías",
    watched: "Vistas",
    watchlist: "Watchlist",
    connections: "Conexiones",
    menu: "Menú",
  },
  account: {
    toggleTheme: "Cambiar tema",
    accountMenu: (followerCount) =>
      `Menú de cuenta — ${followerCount} ${followerCount === 1 ? "seguidor" : "seguidores"}`,
    myProfile: "Mi perfil",
    myBoard: "Mi tablón de recomendaciones",
    inviteFriend: "Invitar a un amigo",
    exportData: "Exportar datos",
    exporting: "Exportando…",
    signOut: "Cerrar sesión",
    continueWithGoogle: "Continuar con Google",
    exportDownloaded: "Datos exportados",
    exportFailed: "No se pudo exportar tus datos. Intentá de nuevo.",
  },
  footer: {
    tmdbAttribution:
      "Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB.",
    privacyLink: "Privacidad y datos",
    copyright: (year) => `© ${year} Pelicoolas`,
    deployed: (date) => `Desplegado ${date}`,
  },
  onboarding: {
    progressLabel: "Progreso",
    next: "Siguiente",
    continue: "Continuar",
    slides: [
      {
        kicker: "Pelicoolas",
        title: "¿Cuántas películas de tu actor favorito realmente viste?",
        description:
          "Seguí a los actores y directores que te gustan, marcá lo que ya viste, y descubrí qué te falta.",
      },
      {
        kicker: "Filmografías",
        title: "Seguí actores y directores. Marcá lo que ya viste.",
        description:
          "Cada persona que seguís tiene su propio progreso — sabés exactamente cuánto te falta para completar su filmografía.",
      },
      {
        kicker: "Watchlist & logros",
        title: "Guardá lo que querés ver. Desbloqueá insignias.",
        description:
          "Tu watchlist personal, y una recompensa cada vez que completás la filmografía de alguien.",
      },
      {
        kicker: "Empezá gratis",
        title: "Tu progreso de cine, siempre visible.",
        description:
          "Sin redes, sin ruido. Solo vos, tus filmografías, y lo que te falta ver.",
      },
    ],
  },
  locale: {
    switchLanguage: "Cambiar idioma",
  },
};
