import type { VideoGap } from "@/lib/types";

function list(nums: number[]): string {
  if (nums.length === 1) return `scene ${nums[0]}`;
  return `scenes ${nums.slice(0, -1).join(", ")} and ${nums[nums.length - 1]}`;
}

/** Copy for the "finish with stills" choice on a film that stopped for missing AI clips. */
export function gapCopy(gap: VideoGap) {
  const n = gap.missing.length;
  const which = list(gap.missing);
  return {
    title: `${gap.ready} of ${gap.total} scenes are filmed`,
    why:
      gap.reason === "blocked"
        ? `Google's content rules blocked ${which}, even after rewriting it. That usually means the idea uses an existing character, brand or real person.`
        : `AI video ran out before ${which} could be filmed. The daily quota resets at midnight Pacific.`,
    choice: `Finish now and ${which} will use ${n === 1 ? "its" : "their"} still image with a slow camera move; any dialogue there is voiced off-screen. No more AI video is charged.`,
    finish: `Finish with ${n} still${n === 1 ? "" : "s"}`,
    retry: gap.reason === "blocked" ? "Try filming again" : "Try again later",
  };
}
