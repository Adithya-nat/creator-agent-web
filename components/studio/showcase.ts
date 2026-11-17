/** Films made with Creator Agent that the homepage library shows (posters in /public/films). */
export interface ShowcaseFilm {
  id: string;
  title: string;
  genre: string;
  lang: "en" | "ta";
  poster: string;
}

export const SHOWCASE: readonly ShowcaseFilm[] = [
  { id: "grand-theft-auto-chennai", title: "Grand Theft Auto Chennai", genre: "Crime comedy", lang: "ta", poster: "/films/grand-theft-auto-chennai.webp" },
  { id: "irumbukai-mayavi", title: "Irumbukai Mayavi", genre: "Spy action", lang: "ta", poster: "/films/irumbukai-mayavi.webp" },
  { id: "escape-the-anaconda", title: "Escape the Anaconda", genre: "Survival thriller", lang: "en", poster: "/films/escape-the-anaconda.webp" },
  { id: "battle-sativa", title: "Battle Sativa", genre: "Comedy", lang: "en", poster: "/films/battle-sativa.webp" },
];

export const HOMEPAGE_URL = (
  process.env.NEXT_PUBLIC_HOMEPAGE_URL || "https://adithya-nat.github.io/creator-agent/"
).replace(/\/?$/, "/");

/** The homepage's film library, optionally opened on one film. */
export const filmsPage = (id?: string) => `${HOMEPAGE_URL}films.html${id ? `#${id}` : ""}`;
