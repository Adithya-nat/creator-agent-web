"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clapperboard, PauseCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { useToast } from "@/components/controls/primitives";
import { ENTER, EXIT } from "@/components/production/motion";
import { Spinner } from "@/components/Spinner";
import { ApiError, recut } from "@/lib/api";
import { keyOf, lanes as lanesOf, refLabel, ripple, suggestions, toggle, touchedScenes } from "@/lib/recut";
import type { RecutMap, RecutPlan, RecutRef, TakeView } from "@/lib/types";
import { DirectorDock } from "./DirectorDock";
import { FilmTimeline } from "./FilmTimeline";
import { FilmChips, Lanes } from "./Lanes";
import { PlanSheet } from "./PlanSheet";

const errorText = (e: unknown) => {
  if (!(e instanceof ApiError)) return "Can't reach the server. Is the API running?";
  if (e.status === 400) return "Add your Gemini key to recut this film.";
  if (e.status === 429) return "You already have a film rendering. Try again when it finishes.";
  return e.message;
};

/** The editing bay: pick any part of the film (Shift/Cmd for more), see what it
 *  ripples into, leave the director a note, review the plan as edit timelines, recut. */
export function RecutBay({
  jobId,
  map,
  initial,
  pausing,
  onPause,
  onStarted,
  onClose,
}: {
  jobId: string;
  map: RecutMap;
  initial: RecutRef[];
  pausing: boolean;
  onPause: () => void;
  onStarted: (cut: number) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const { needsKey, hasKey, openKeyDialog } = useAccount();
  const [sel, setSel] = useState<RecutRef[]>(initial);
  const [note, setNote] = useState("");
  const [quickFor, setQuickFor] = useState<{ key: string; plan: RecutPlan } | null>(null);
  const [plan, setPlan] = useState<RecutPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [review, setReview] = useState(true);
  const top = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  const scenes = map.scenes.map((s) => s.order);
  const hasClips = map.kinds.includes("clip");
  const rippled = useMemo(() => ripple(sel, scenes, hasClips), [sel, scenes, hasClips]);
  const selected = useMemo(() => new Set(sel.map(keyOf)), [sel]);
  const touched = useMemo(() => touchedScenes(plan ? plan.items.map(keyOf) : rippled), [plan, rippled]);
  const chips = suggestions(sel, map);
  const selKey = sel.map(keyOf).join(",");
  const quick = quickFor?.key === selKey ? quickFor.plan : null;

  useEffect(() => {
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Live cost of the picks (no note = no director call, nothing spent).
  useEffect(() => {
    if (!sel.length || sel.some((s) => s.kind === "scene") || !map.can_recut) return;
    let cancelled = false;
    const key = selKey;
    const t = setTimeout(async () => {
      try {
        const p = await recut.plan(jobId, sel, "");
        if (!cancelled) setQuickFor({ key, plan: p });
      } catch {
        // the estimate is a hint; the plan step reports real errors
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // selKey captures sel's identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, jobId, map.can_recut]);

  const pick = useCallback((ref: RecutRef, additive: boolean) => {
    setPlan(null);
    setSel((s) => toggle(s, ref, additive));
  }, []);

  const guardKey = () => {
    if (needsKey && !hasKey) {
      setError("Add your Gemini key to recut this film.");
      openKeyDialog();
      return false;
    }
    return true;
  };

  const doPlan = async () => {
    if (!sel.length || planning) return;
    setError(null);
    const directed = !!note.trim() || sel.some((s) => s.kind === "scene");
    if (!directed && quick) {
      setPlan(quick);
    } else {
      if (directed && !guardKey()) return;
      setPlanning(true);
      try {
        setPlan(await recut.plan(jobId, sel, note));
      } catch (e) {
        setError(errorText(e));
        if (e instanceof ApiError && e.status === 400) openKeyDialog();
      } finally {
        setPlanning(false);
      }
    }
    setExtras(new Set());
    requestAnimationFrame(() => sheet.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const confirm = async () => {
    if (!plan || starting || !guardKey()) return;
    setStarting(true);
    setError(null);
    try {
      const accept = plan.extra.filter((e) => extras.has(keyOf(e))).map(({ kind, unit }) => ({ kind, unit }));
      const res = await recut.start(
        jobId,
        plan.plan_id
          ? { plan_id: plan.plan_id, accept_extra: accept, review_frames: review }
          : { targets: sel, accept_extra: accept, review_frames: review },
      );
      const checks = review && plan.review_frames_available;
      toast({
        tone: "ok",
        title: `Cut ${res.cut} is rendering`,
        body: checks
          ? "New frames first; the film then pauses so you can check them before any clip is filmed."
          : "Only the picked parts are made again. Earlier versions are kept as takes.",
      });
      onStarted(res.cut);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setStarting(false);
    }
  };

  const restore = async (take: TakeView) => {
    if (!guardKey()) return;
    setStarting(true);
    setError(null);
    try {
      const res = await recut.restore(jobId, take.id);
      toast({ tone: "ok", title: `${take.label} is back`, body: `Cut ${res.cut} rebuilds the edit around it. Nothing new is drawn or filmed.` });
      onStarted(res.cut);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setStarting(false);
    }
  };

  // ⌘↵ confirms a shown plan; Esc closes the bay (or the plan first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (plan) setPlan(null);
        else onClose();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && plan) {
        e.preventDefault();
        void confirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pickBlock = (order: number, additive: boolean) => pick({ kind: hasClips ? "clip" : "frame", unit: order }, additive);

  return (
    <>
      <motion.section
        ref={top}
        layout
        aria-label="Recut"
        className="glass relative scroll-mt-24 overflow-hidden p-5 sm:p-6"
        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: ENTER }}
        exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: EXIT }}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-leak/70 to-transparent" />
        <header className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-leak/10 text-leak shadow-[0_0_0_1px_rgba(110,231,249,0.35)]">
            <Clapperboard className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.18em] text-leak">RECUT</p>
            <h2 className="font-display text-[26px] font-extrabold uppercase leading-8 tracking-wide text-ink">Redo any part</h2>
            <p className="mt-1 text-sm text-muted">
              Pick clips, frames, lines or the whole look; Shift-click to pick more. Only what you pick, and what depends on it, is made again. Earlier
              versions stay as takes. The film still expires on its countdown.
            </p>
          </div>
        </header>

        {!map.can_recut && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[14px] bg-state-warn/10 px-4 py-3 text-sm text-state-warn shadow-[0_0_0_1px_rgba(232,197,71,0.3)]">
            {pausing && <Spinner />}
            <span className="min-w-0 flex-1">{map.reason}</span>
            {(map.status === "running" || map.status === "queued") && (
              <button type="button" onClick={onPause} className="press inline-flex min-h-10 items-center gap-2 rounded-full bg-state-warn px-4 text-sm font-semibold text-midnight">
                <PauseCircle className="h-4 w-4" strokeWidth={2.25} aria-hidden /> Pause now
              </button>
            )}
          </div>
        )}

        <div className="mt-5 space-y-5">
          <FilmTimeline scenes={map.scenes} cuts={map.cuts} touched={touched} onPick={pickBlock} planned={!!plan} />
          <FilmChips items={map.film} kinds={map.kinds} selected={selected} rippled={rippled} onPick={pick} />
          <Lanes map={map} lanes={lanesOf(map)} selected={selected} rippled={rippled} onPick={pick} onRestore={restore} busy={starting || !map.can_recut} />
        </div>
      </motion.section>

      <div ref={sheet} className="scroll-mt-24">
        <AnimatePresence initial={false}>
          {plan && (
            <motion.div key={`${selKey}:${plan.plan_id ?? "q"}`} className="mt-4" exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: EXIT }}>
              <PlanSheet
                map={map}
                plan={plan}
                extras={extras}
                onExtra={(r) =>
                  setExtras((s) => {
                    const n = new Set(s);
                    const k = keyOf(r);
                    if (n.has(k)) n.delete(k);
                    else n.add(k);
                    return n;
                  })
                }
                review={review}
                onReview={setReview}
                onConfirm={() => void confirm()}
                onEdit={() => setPlan(null)}
                starting={starting}
              />
              {error && (
                <p role="alert" className="mt-2 text-sm text-state-bad">
                  {error}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!plan && map.can_recut && (
          <DirectorDock
            key="dock"
            selection={sel}
            note={note}
            onNote={setNote}
            chips={chips}
            estimate={quick?.estimate ?? null}
            planning={planning}
            onPlan={() => void doPlan()}
            onRemove={(r) => {
              setPlan(null);
              setSel((s) => s.filter((x) => keyOf(x) !== keyOf(r)));
            }}
            onClose={onClose}
            error={error}
          />
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {sel.length ? `Picked ${sel.map(refLabel).join(", ")}` : ""}
      </span>
    </>
  );
}
