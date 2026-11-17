import type { PosterLook } from "@/lib/types";

/** How each poster look is shown in the picker and in the live title preview. */
export const LOOKS: {
  id: PosterLook;
  label: string;
  note: string;
  swatch: string;
  /** Classes for the title preview drawn over the frame before the real poster exists. */
  title: string;
}[] = [
  {
    id: "auto",
    label: "Director's pick",
    note: "Matches the genre",
    swatch: "linear-gradient(135deg,#f2b544,#6ee7f9)",
    title: "font-sans font-semibold tracking-[-0.03em] text-white",
  },
  {
    id: "blockbuster",
    label: "Blockbuster",
    note: "Metal title, lens flare",
    swatch: "linear-gradient(135deg,#0f3b4c,#e07b39)",
    title:
      "font-display font-extrabold uppercase tracking-[0.02em] text-transparent bg-clip-text bg-[linear-gradient(180deg,#fff,#c9d3dc_55%,#7d8a96)] drop-shadow-[0_2px_10px_rgba(255,170,80,0.55)]",
  },
  {
    id: "thriller",
    label: "Thriller",
    note: "Cold, condensed, shadow",
    swatch: "linear-gradient(135deg,#0b0f14,#3d4a5c)",
    title: "font-display font-semibold uppercase tracking-[0.28em] text-[#e8eef4]",
  },
  {
    id: "retro",
    label: "Hand-painted",
    note: "Vintage cinema banner",
    swatch: "linear-gradient(135deg,#c2410c,#facc15)",
    title:
      "font-display font-extrabold italic uppercase text-[#ffd34d] [text-shadow:3px_3px_0_#b4231b,6px_6px_0_rgba(0,0,0,0.5)]",
  },
  {
    id: "comedy",
    label: "Comedy",
    note: "Chunky, bright, playful",
    swatch: "linear-gradient(135deg,#f472b6,#fde047)",
    title:
      "font-sans font-extrabold text-white [-webkit-text-stroke:2px_#111] [paint-order:stroke_fill] [text-shadow:0_4px_0_#111]",
  },
  {
    id: "arthouse",
    label: "Arthouse",
    note: "Small serif, quiet",
    swatch: "linear-gradient(135deg,#d6cfc2,#6b6a66)",
    title: "[font-family:Georgia,serif] font-normal italic tracking-[0.04em] text-[#f4efe6]",
  },
];

export const lookById = (id: PosterLook) => LOOKS.find((l) => l.id === id) ?? LOOKS[0];
