"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, BookOpen, Film, History, Image as ImageIcon, Megaphone, Music, Palette, ScrollText, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { EASE, ENTER, EXIT } from "@/components/production/motion";
import { recut } from "@/lib/api";
import { keyOf, LABEL } from "@/lib/recut";
import type { RecutFilmItem, RecutKind, RecutMap, RecutRef, RecutScene, TakeView } from "@/lib/types";
import { FrameWipe, Sheen } from "./EditViews";

type Lane = "scene" | "frame" | "clip" | "voice";

const LANE_ICON = { scene: ScrollText, frame: ImageIcon, clip: Film, voice: AudioLines } as const;
const FILM_ICON = { story: BookOpen, look: Palette, score: Music, release: Megaphone } as const;

const STATUS: Record<RecutScene["status"], { label: string; cls: string }> = {
  ok: { label: "", cls: "" },
  qc: { label: "QC", cls: "bg-state-warn text-midnight" },
  blocked: { label: "Blocked", cls: "bg-state-bad text-midnight" },
  missing: { label: "Not filmed", cls: "bg-white/15 text-ink" },
  pending: { label: "Pending", cls: "bg-white/10 text-muted" },
};

/** Lanes like an editing app: one column per scene, one row per layer (script, frame,
 *  clip, voice). Click to pick, Shift/Cmd-click to add. What a pick would rebuild
 *  carries a dashed ring and a left-to-right sweep. */
export function Lanes({
  map,
  lanes,
  selected,
  rippled,
  onPick,
  onRestore,
  busy,
}: {
  map: RecutMap;
  lanes: Lane[];
  selected: Set<string>;
  rippled: Set<string>;
  onPick: (ref: RecutRef, additive: boolean) => void;
  onRestore: (take: TakeView) => void;
  busy: boolean;
}) {
  const [openTakes, setOpenTakes] = useState<number | null>(null);
  return (
    <div className="relative">
      <div className="overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
        <div className="grid w-max gap-x-2 gap-y-2" style={{ gridTemplateColumns: `72px repeat(${map.scenes.length}, 112px)` }}>
          {lanes.map((lane) => {
            const Icon = LANE_ICON[lane];
            return [
              <div key={`${lane}-label`} className="sticky left-0 z-10 flex items-start gap-1.5 bg-midnight/80 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted backdrop-blur">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {lane === "scene" ? "Script" : LABEL[lane] + "s"}
              </div>,
              ...map.scenes.map((sc, col) => (
                <Tile
                  key={`${lane}-${sc.order}`}
                  lane={lane}
                  scene={sc}
                  col={col}
                  selected={selected.has(`${lane}-${sc.order}`)}
                  rippled={rippled.has(`${lane}-${sc.order}`)}
                  onPick={(additive) => onPick({ kind: lane, unit: sc.order }, additive)}
                  onTakes={() => setOpenTakes((o) => (o === sc.order ? null : sc.order))}
                />
              )),
            ];
          })}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {openTakes != null && (
          <TakesPanel
            key={openTakes}
            scene={map.scenes.find((s) => s.order === openTakes)!}
            onClose={() => setOpenTakes(null)}
            onRestore={onRestore}
            busy={busy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Tile({
  lane,
  scene,
  col,
  selected,
  rippled,
  onPick,
  onTakes,
}: {
  lane: Lane;
  scene: RecutScene;
  col: number;
  selected: boolean;
  rippled: boolean;
  onPick: (additive: boolean) => void;
  onTakes: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const takes = scene.takes.filter((t) => (lane === "frame" ? t.kind === "frame" : lane === "clip" ? t.kind === "clip" : lane === "voice" ? t.kind === "voice" : false));
  const st = STATUS[scene.status];
  const tall = lane === "frame" || lane === "clip";
  const disabled = (lane === "clip" && !scene.frame_url) || (lane === "voice" && scene.mode !== "narration");
  const line = scene.shots.flatMap((s) => s.lines)[0];

  return (
    <motion.div
      className="relative"
      animate={{ y: selected ? -4 : 0 }}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`${LABEL[lane]} ${scene.order}${st.label ? `, ${st.label}` : ""}${rippled && !selected ? ", will be redone" : ""}`}
        onClick={(e) => onPick(e.shiftKey || e.metaKey || e.ctrlKey)}
        onPointerEnter={() => void video.current?.play().catch(() => {})}
        onPointerLeave={() => {
          if (video.current) {
            video.current.pause();
            video.current.currentTime = 0;
          }
        }}
        onFocus={() => void video.current?.play().catch(() => {})}
        onBlur={() => video.current?.pause()}
        className={`press relative block w-full overflow-hidden rounded-[12px] text-left transition-[box-shadow,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
          tall ? "h-[140px]" : "h-[72px]"
        } ${
          selected
            ? "shadow-[0_0_0_2px_#f2b544,0_12px_28px_-12px_rgba(242,181,68,0.55)]"
            : rippled
              ? "shadow-[0_0_0_1px_rgba(242,181,68,0.5)] [outline:1px_dashed_rgba(242,181,68,0.55)] outline-offset-2"
              : "shadow-[0_0_0_1px_var(--color-line)] hover:shadow-[0_0_0_1px_rgba(244,239,230,0.25)]"
        } bg-surface-2`}
      >
        {lane === "scene" && (
          <span className="block p-2 text-[11px] leading-snug text-ink/85">
            <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {scene.order} · {scene.beat_role || scene.mode}
            </span>
            <span className="line-clamp-3">{line ? `${line.speaker}: ${line.text}` : scene.narration || scene.description}</span>
          </span>
        )}
        {lane === "frame" &&
          (scene.frame_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recut.media(scene.frame_url)} alt="" className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-white/10" />
          ) : (
            <span className="grid h-full place-items-center text-[11px] text-muted">No frame</span>
          ))}
        {lane === "clip" &&
          (scene.clip_url ? (
            <video ref={video} src={recut.media(scene.clip_url)} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center gap-1 p-2 text-center text-[11px] text-muted">
              {scene.status === "blocked" ? (
                <>
                  <TriangleAlert className="h-5 w-5 text-state-bad" strokeWidth={2} aria-hidden />
                  Blocked by Google
                </>
              ) : (
                "Not filmed"
              )}
            </span>
          ))}
        {lane === "voice" && (
          <span className="flex h-full items-center gap-2 p-2 text-[11px] text-muted">
            <AudioLines className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className="line-clamp-3">{scene.narration || "—"}</span>
          </span>
        )}

        {rippled && !selected && <Sheen delay={col * 0.12} />}
        {tall && (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-ink">
            {scene.order}
            {lane === "clip" && scene.clip_url ? ` · ${scene.seconds.toFixed(0)}s` : ""}
          </span>
        )}
        {lane === "clip" && st.label && scene.status !== "pending" && (
          <span className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] ${st.cls}`}>{st.label}</span>
        )}
        {rippled && !selected && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-midnight/80 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-accent">will redo</span>
        )}
      </button>
      {takes.length > 0 && (
        <button
          type="button"
          onClick={onTakes}
          aria-label={`${takes.length} earlier take${takes.length > 1 ? "s" : ""} of ${LABEL[lane].toLowerCase()} ${scene.order}`}
          className="press absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-leak px-1 font-mono text-[10px] font-semibold text-midnight shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        >
          v{takes.length + 1}
        </button>
      )}
    </motion.div>
  );
}

/** Earlier takes of one scene: compare with a wipe, bring one back for free. */
function TakesPanel({ scene, onClose, onRestore, busy }: { scene: RecutScene; onClose: () => void; onRestore: (t: TakeView) => void; busy: boolean }) {
  const takes = [...scene.takes].sort((a, b) => b.cut - a.cut);
  const [pick, setPick] = useState(takes[0]?.id ?? null);
  const take = takes.find((t) => t.id === pick) ?? null;
  const img = take?.urls.find((u) => /\.png/.test(u)) ?? null;
  const vid = take?.urls.find((u) => /\.mp4/.test(u)) ?? null;
  return (
    <motion.section
      aria-label={`Earlier takes of scene ${scene.order}`}
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
      exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: EXIT }}
      className="glass-2 mt-3 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-leak">
          <History className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> SCENE {scene.order} · EARLIER TAKES
        </p>
        <button type="button" onClick={onClose} className="press min-h-9 rounded-full px-3 text-xs text-muted hover:text-ink">
          Close
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {takes.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={t.id === pick}
            onClick={() => setPick(t.id)}
            className={`press min-h-9 rounded-full px-3 text-xs ${t.id === pick ? "bg-ink text-midnight" : "text-ink/80 shadow-[0_0_0_1px_var(--color-line)]"}`}
          >
            {t.label} · before cut {t.cut}
          </button>
        ))}
      </div>
      {take && (
        <div className="mt-4 grid gap-4 sm:grid-cols-[200px_200px_1fr] sm:items-start">
          {img && scene.frame_url ? (
            <FrameWipe before={img} after={scene.frame_url} />
          ) : img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recut.media(img)} alt="Earlier frame" className="aspect-[9/16] w-full rounded-[12px] object-cover" />
          ) : null}
          {vid && (
            <div className="space-y-1">
              <video src={recut.media(vid)} controls playsInline className="aspect-[9/16] w-full rounded-[12px] bg-black" />
              <p className="font-mono text-[10px] text-muted">earlier clip</p>
            </div>
          )}
          <div className="space-y-2 text-sm text-muted">
            <p>Bring this take back to the film. What depends on it (captions, the edit) is rebuilt; nothing new is drawn or filmed.</p>
            <button
              type="button"
              disabled={busy || !take.restorable}
              onClick={() => onRestore(take)}
              className="press inline-flex min-h-11 items-center rounded-full bg-leak px-5 text-sm font-semibold text-midnight disabled:opacity-50"
            >
              Use this take
            </button>
          </div>
        </div>
      )}
    </motion.section>
  );
}

/** Whole-film items: story, look, score, release. */
export function FilmChips({
  items,
  kinds,
  selected,
  rippled,
  onPick,
}: {
  items: RecutFilmItem[];
  kinds: RecutKind[];
  selected: Set<string>;
  rippled: Set<string>;
  onPick: (ref: RecutRef, additive: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Whole-film items">
      {items
        .filter((it) => kinds.includes(it.kind))
        .map((it, i) => {
          const Icon = FILM_ICON[it.kind];
          const k = keyOf({ kind: it.kind, unit: null });
          const on = selected.has(k);
          const ripple = rippled.has(k) && !on;
          return (
            <motion.button
              key={it.kind}
              type="button"
              aria-pressed={on}
              title={it.detail}
              onClick={(e) => onPick({ kind: it.kind, unit: null }, e.shiftKey || e.metaKey || e.ctrlKey)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
              className={`press relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-full pl-2 pr-4 text-sm transition-[background-color,box-shadow] duration-150 ${
                on
                  ? "bg-accent text-midnight"
                  : ripple
                    ? "text-accent shadow-[0_0_0_1px_rgba(242,181,68,0.55)]"
                    : "text-ink/85 shadow-[0_0_0_1px_var(--color-line)] hover:bg-white/[0.05]"
              }`}
            >
              {ripple && <Sheen delay={0.4 + i * 0.1} />}
              {it.kind === "look" && it.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recut.media(it.url)} alt="" className="h-7 w-7 rounded-full object-cover outline outline-1 -outline-offset-1 outline-white/10" />
              ) : (
                <span className={`grid h-7 w-7 place-items-center rounded-full ${on ? "bg-midnight/15" : "bg-white/[0.06]"}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </span>
              )}
              {it.label}
              {it.takes.length > 0 && <span className="font-mono text-[10px] opacity-70">v{it.takes.length + 1}</span>}
            </motion.button>
          );
        })}
    </div>
  );
}
