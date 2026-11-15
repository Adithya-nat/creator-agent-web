// Chart palette: validated (dataviz validate_palette, dark mode, surface #12141c).
// Fixed order: a category keeps its color regardless of which categories are present.
export const CATEGORY_ORDER = ["video", "image", "text", "tts", "transcribe", "music"] as const;
export const CATEGORY_COLOR: Record<string, string> = {
  video: "#3987e5",
  image: "#d95926",
  text: "#199e70",
  tts: "#c98500",
  transcribe: "#d55181",
  music: "#008300",
};
export const CATEGORY_LABEL: Record<string, string> = {
  video: "AI video",
  image: "Images",
  text: "Script & judge",
  tts: "Narration",
  transcribe: "Captions",
  music: "Music",
};
export const DURATION_COLOR: Record<string, string> = { "30": "#3987e5", "60": "#d95926" };

/** Categories present in the data, in the fixed order (unknown ones appended). */
export function orderedCategories(present: string[]): string[] {
  const known = CATEGORY_ORDER.filter((c) => present.includes(c));
  return [...known, ...present.filter((c) => !(CATEGORY_ORDER as readonly string[]).includes(c))];
}

/** [{storyStyle, "30": avg, "60": avg}] from {"dialogue_30": 4.2, ...}. Not `style`: Recharts spreads row fields onto the SVG path. */
export function styleDurationRows(avg: Record<string, number>) {
  return (["dialogue", "mixed", "narrated"] as const)
    .map((storyStyle) => ({ storyStyle, "30": avg[`${storyStyle}_30`] ?? null, "60": avg[`${storyStyle}_60`] ?? null }))
    .filter((r) => r["30"] != null || r["60"] != null);
}

export function share(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}
