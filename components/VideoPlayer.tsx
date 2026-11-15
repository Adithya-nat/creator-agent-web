"use client";

import { forwardRef } from "react";

/** Vertical 9:16 player. Poster is the first frame so it looks intentional even
 *  before playback (and in mock mode with placeholder frames). */
export const VideoPlayer = forwardRef<
  HTMLVideoElement,
  { src: string; poster?: string }
>(function VideoPlayer({ src, poster }, ref) {
  return (
    <div className="mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl border border-line bg-black shadow-lift">
      <video
        ref={ref}
        src={src}
        poster={poster}
        controls
        playsInline
        autoPlay
        muted
        loop
        className="h-full w-full object-contain"
      />
    </div>
  );
});
