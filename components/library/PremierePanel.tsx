"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Check, Clapperboard, EyeOff, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { LOOKS, lookById } from "@/components/library/looks";
import { Spinner } from "@/components/Spinner";
import { filmsPage } from "@/components/studio/showcase";
import { api, ApiError, library } from "@/lib/api";
import type { LibraryDetails, LibraryDraft, LibraryEntry, PosterLook, StoryboardScene } from "@/lib/types";

const DEVELOPING = [
  "Copying your film into the library",
  "Picking up the frame",
  "Grading the colour",
  "Setting the title lettering",
  "Laying out the credits",
];

type Props = { jobId: string; scenes: StoryboardScene[]; tamil: boolean };

/** Publish a finished film to the homepage film library, with a poster made from one of its frames. */
export function PremierePanel({ jobId, scenes, tamil }: Props) {
  const { needsKey, hasKey, openKeyDialog } = useAccount();
  const [draft, setDraft] = useState<LibraryDraft | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [entry, setEntry] = useState<LibraryEntry | null>(null);
  const [details, setDetails] = useState<LibraryDetails | null>(null);
  const [look, setLook] = useState<PosterLook>("auto");
  const [frame, setFrame] = useState(1);
  const [retake, setRetake] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<null | "poster" | "publish" | "save" | "remove">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let alive = true;
    library
      .draft(jobId)
      .then((d) => {
        if (!alive) return;
        setDraft(d);
        setEntry(d.entry);
        const e = d.entry;
        setDetails({
          title: e?.title ?? d.title,
          native_title: e ? e.native_title : d.native_title,
          tagline: e?.tagline ?? "",
          logline: e?.logline ?? d.logline,
          genre: e?.genre ?? d.genre,
          show_prompt: e ? e.prompt != null : true,
        });
        setLook(e?.poster_look ?? "auto");
        setFrame(e?.poster_frame ?? d.cover_frame);
      })
      .catch((e) => alive && (e instanceof ApiError && (e.status === 404 || e.status === 410) ? setUnavailable(true) : setError(e.message)));
    return () => {
      alive = false;
    };
  }, [jobId]);

  // Follow a poster while it's being made.
  const rendering = entry?.status === "rendering";
  useEffect(() => {
    if (!rendering || !entry) return;
    const t = setInterval(() => {
      library.get(entry.id).then(setEntry).catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [rendering, entry]);

  const frameUrl = useCallback(
    (order: number) => {
      if (entry && entry.frames.includes(order)) return library.media(`/library/${entry.id}/media/frames/${order}.jpg`);
      const sc = scenes.find((s) => s.order === order);
      return sc?.frame_url ? api.asset(sc.frame_url) : null;
    },
    [entry, scenes],
  );
  const frames = useMemo(
    () => (entry?.frames.length ? entry.frames : draft?.frames ?? []),
    [entry, draft],
  );

  if (unavailable || !draft || !details) return null;

  const missingKey = needsKey && !hasKey;
  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError && e.code === "key_required") openKeyDialog();
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const makePoster = () => {
    if (missingKey) return openKeyDialog();
    if (!details.title.trim()) return setError("Give the film a title first.");
    return run("poster", async () => {
      const clean = { ...details, tagline: details.tagline?.trim() || null };
      const next = entry
        ? await library.poster(entry.id, look, frame, clean.tagline)
        : await library.create(jobId, clean, look, frame);
      setEntry(next);
      setRetake(false);
    });
  };

  const stage: "compose" | "developing" | "ready" | "failed" = !entry
    ? "compose"
    : entry.status === "rendering"
      ? "developing"
      : entry.status === "failed" && !entry.poster_version
        ? "failed"
        : "ready";
  const published = entry?.status === "published";
  const showPickers = stage === "compose" || (stage !== "developing" && (retake || entry?.status === "failed"));

  return (
    <section
      aria-labelledby="premiere-title"
      className="relative overflow-hidden rounded-[28px] bg-surface/70 shadow-[0_0_0_1px_var(--color-line),0_40px_90px_-40px_rgba(0,0,0,0.9)]"
    >
      {/* A wash of the film's light behind the panel. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative grid gap-8 p-5 sm:p-7 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-10">
        <PosterStage
          stage={stage}
          entry={entry}
          frameSrc={frameUrl(frame)}
          look={look}
          title={details.title}
          native={details.native_title ?? null}
        />

        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            <span aria-hidden="true">▶ </span>Premiere
          </p>
          <h3 id="premiere-title" className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink">
            {published ? "Now showing in the film library" : "Put it in the film library"}
          </h3>
          <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-muted">
            {published
              ? "It's on the Creator Agent homepage next to the other films. You can change the poster or take it down any time."
              : "Your film gets a theatrical poster made from one of its own frames, then plays on the Creator Agent homepage next to the other films."}
          </p>

          <AnimatePresence mode="wait" initial={false}>
            {stage === "developing" ? (
              <Developing key="dev" />
            ) : (
              <motion.div
                key="body"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className="mt-6 space-y-6"
              >
                {entry && stage === "ready" && !retake && !editing && (
                  <ReadyActions
                    entry={entry}
                    busy={busy}
                    confirmRemove={confirmRemove}
                    onPublish={() => run("publish", async () => setEntry(await library.publish(entry.id)))}
                    onUnpublish={() => run("publish", async () => setEntry(await library.unpublish(entry.id)))}
                    onRetake={() => setRetake(true)}
                    onEdit={() => setEditing(true)}
                    onRemove={() => {
                      if (!confirmRemove) return setConfirmRemove(true);
                      return run("remove", async () => {
                        await library.remove(entry.id);
                        setEntry(null);
                        setConfirmRemove(false);
                      });
                    }}
                  />
                )}

                {entry?.status === "failed" && entry.error && (
                  <p role="alert" className="rounded-xl bg-state-bad/10 px-4 py-3 text-sm text-state-bad">
                    {entry.error}
                  </p>
                )}

                {(stage === "compose" || editing) && (
                  <DetailsForm details={details} onChange={setDetails} tamil={tamil || !!draft.native_title} prompt={draft.prompt} />
                )}

                {showPickers && (
                  <>
                    <LookPicker value={look} onChange={setLook} />
                    <FramePicker frames={frames} value={frame} onChange={setFrame} src={frameUrl} />
                  </>
                )}

                {(showPickers || editing) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            run("save", async () => {
                              setEntry(await library.edit(entry!.id, { ...details, tagline: details.tagline?.trim() || null }));
                              setEditing(false);
                            })
                          }
                          className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-midnight disabled:opacity-50"
                        >
                          {busy === "save" ? <Spinner /> : <Check className="h-4 w-4" aria-hidden="true" />} Save details
                        </button>
                        <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-3 text-sm text-muted hover:text-ink">
                          Cancel
                        </button>
                        <p className="w-full text-xs text-muted">The poster keeps its lettering; make a new poster to change the title on it.</p>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={makePoster}
                          disabled={busy !== null || (entry != null && entry.posters_left <= 0)}
                          className="press sheen inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-midnight shadow-[0_10px_30px_-10px_rgba(242,181,68,0.6)] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy === "poster" ? <Spinner /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                          {missingKey ? "Add your Gemini key" : entry ? "Make a new poster" : "Make the poster"}
                        </button>
                        {retake && (
                          <button type="button" onClick={() => setRetake(false)} className="min-h-11 px-3 text-sm text-muted hover:text-ink">
                            Keep this poster
                          </button>
                        )}
                        <p className="text-xs text-muted">
                          One image on your Gemini key
                          {entry ? ` · ${entry.posters_left} ${entry.posters_left === 1 ? "try" : "tries"} left` : ""}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-sm text-state-bad">
                    {error}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------------------- //
// The poster: a live title preview on the chosen frame, then the real poster.
// --------------------------------------------------------------------------- //
function PosterStage({
  stage,
  entry,
  frameSrc,
  look,
  title,
  native,
}: {
  stage: "compose" | "developing" | "ready" | "failed";
  entry: LibraryEntry | null;
  frameSrc: string | null;
  look: PosterLook;
  title: string;
  native: string | null;
}) {
  // Pointer tilt: the poster leans toward the cursor like a card in your hand.
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), { stiffness: 180, damping: 22 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), { stiffness: 180, damping: 22 });
  const glare = useTransform(px, (x) => `radial-gradient(60% 50% at ${(x + 0.5) * 100}% 20%, rgba(255,255,255,0.35), transparent 70%)`);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  const poster = entry && entry.poster_version > 0 ? library.media(entry.media.poster) : null;
  const showPoster = poster && (stage === "ready" || stage === "failed");
  const L = lookById(look);

  return (
    <div className="mx-auto w-full max-w-[300px] [perspective:1100px]">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX: rx, rotateY: ry }}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-midnight shadow-[0_0_0_1px_var(--color-line),0_40px_80px_-30px_rgba(0,0,0,0.95)] [transform-style:preserve-3d]"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {showPoster ? (
            <motion.img
              key={`poster-${entry!.poster_version}`}
              src={poster!}
              alt={`Poster for ${entry!.title}`}
              initial={{ opacity: 0, scale: 1.06, filter: "blur(12px) brightness(1.8)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px) brightness(1)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : frameSrc ? (
            <motion.div key="frame" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed API media */}
              <img
                src={frameSrc}
                alt=""
                className={`h-full w-full object-cover transition-[filter] duration-700 ${stage === "developing" ? "brightness-[0.55] saturate-[0.6]" : "brightness-[0.8]"}`}
              />
              {stage !== "developing" && (
                <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-1 bg-gradient-to-b from-black/70 to-transparent px-4 pb-16 pt-8 text-center">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={look}
                      initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className={`text-[26px] leading-[0.95] [text-wrap:balance] ${L.title}`}
                    >
                      {title || "Your title"}
                    </motion.p>
                  </AnimatePresence>
                  {native && <p className="font-tamil text-sm text-white/85">{native}</p>}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted">
              <Clapperboard className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
        </AnimatePresence>

        {stage === "developing" && (
          <>
            <div aria-hidden="true" className="develop-scan absolute inset-0" />
            <div aria-hidden="true" className="absolute inset-3 rounded-xl border border-dashed border-accent/40" />
          </>
        )}
        {showPoster && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-soft-light"
            style={{ background: glare }}
          />
        )}
        <span className="pointer-events-none absolute inset-0 rounded-2xl outline outline-1 -outline-offset-1 outline-white/10" />
      </motion.div>
      <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        {stage === "developing"
          ? "Developing"
          : showPoster
            ? `${lookById(entry!.poster_look).label} · frame ${entry!.poster_frame}`
            : "Live title preview"}
      </p>
    </div>
  );
}

function Developing() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, DEVELOPING.length - 1)), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-8 space-y-3"
      role="status"
      aria-live="polite"
    >
      <ol className="space-y-2.5">
        {DEVELOPING.map((step, n) => (
          <li key={step} className={`flex items-center gap-3 text-sm transition-colors duration-300 ${n <= i ? "text-ink" : "text-muted/50"}`}>
            <span className="grid h-5 w-5 place-items-center">
              {n < i ? (
                <Check className="h-4 w-4 text-state-ok" aria-hidden="true" />
              ) : n === i ? (
                <Spinner className="h-4 w-4 text-accent" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <p className="pt-2 text-xs text-muted">Usually under a minute. You can leave this page; it keeps going.</p>
    </motion.div>
  );
}

function ReadyActions({
  entry,
  busy,
  confirmRemove,
  onPublish,
  onUnpublish,
  onRetake,
  onEdit,
  onRemove,
}: {
  entry: LibraryEntry;
  busy: string | null;
  confirmRemove: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onRetake: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const published = entry.status === "published";
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        {[
          ["Title", entry.title],
          ["Genre", entry.genre || "Short film"],
          ["Length", `${Math.floor(entry.length_seconds / 60)}:${String(entry.length_seconds % 60).padStart(2, "0")}`],
          ["Prompt", entry.prompt ? "Shown" : "Private"],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="truncate text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        {published ? (
          <>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-state-ok/10 px-4 text-sm font-medium text-state-ok">
              <span className="rec-dot h-2 w-2 rounded-full bg-state-ok" aria-hidden="true" /> Live in the library
            </span>
            <a
              href={filmsPage(`p-${entry.id}`)}
              target="_blank"
              rel="noopener"
              className="press group inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-midnight"
            >
              See it on the homepage
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={busy !== null}
            className="press sheen inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-midnight shadow-[0_10px_30px_-10px_rgba(242,181,68,0.6)] hover:bg-accent-hover disabled:opacity-50"
          >
            {busy === "publish" ? <Spinner /> : <Clapperboard className="h-4 w-4" aria-hidden="true" />} Publish to the library
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-1 gap-y-2 border-t border-line pt-4 text-sm">
        <SmallAction onClick={onRetake} disabled={busy !== null || entry.posters_left <= 0} Icon={RotateCcw}>
          {entry.posters_left > 0 ? "Try another look" : "No poster tries left"}
        </SmallAction>
        <SmallAction onClick={onEdit} disabled={busy !== null} Icon={Sparkles}>
          Edit details
        </SmallAction>
        {published && (
          <SmallAction onClick={onUnpublish} disabled={busy !== null} Icon={EyeOff}>
            Take it down
          </SmallAction>
        )}
        <SmallAction onClick={onRemove} disabled={busy !== null} Icon={Trash2} danger={confirmRemove}>
          {confirmRemove ? "Click again to remove it" : "Remove from library"}
        </SmallAction>
      </div>
    </div>
  );
}

function SmallAction({
  onClick,
  disabled,
  Icon,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  Icon: typeof Check;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 transition-colors duration-150 hover:bg-ink/[0.05] disabled:opacity-40 ${
        danger ? "text-state-bad" : "text-muted hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

// --------------------------------------------------------------------------- //
// Form + pickers
// --------------------------------------------------------------------------- //
const field =
  "mt-1.5 block w-full rounded-xl border border-line bg-midnight/60 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/60 transition-[border-color,box-shadow] duration-150 focus:border-accent/60 focus:shadow-[0_0_0_3px_rgba(242,181,68,0.15)] focus:outline-none";

function DetailsForm({
  details,
  onChange,
  tamil,
  prompt,
}: {
  details: LibraryDetails;
  onChange: (d: LibraryDetails) => void;
  tamil: boolean;
  prompt: string;
}) {
  const set = <K extends keyof LibraryDetails>(k: K, v: LibraryDetails[K]) => onChange({ ...details, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm text-muted sm:col-span-2">
        Title on the poster
        <input value={details.title} maxLength={120} onChange={(e) => set("title", e.target.value)} className={field} />
      </label>
      {tamil && (
        <label className="block text-sm text-muted">
          Tamil title <span className="text-muted/70">(optional)</span>
          <input
            value={details.native_title ?? ""}
            maxLength={160}
            lang="ta"
            onChange={(e) => set("native_title", e.target.value)}
            className={`${field} font-tamil`}
          />
        </label>
      )}
      <label className="block text-sm text-muted">
        Genre
        <input value={details.genre} maxLength={48} placeholder="Crime comedy" onChange={(e) => set("genre", e.target.value)} className={field} />
      </label>
      <label className={`block text-sm text-muted ${tamil ? "sm:col-span-2" : ""}`}>
        Tagline <span className="text-muted/70">(optional)</span>
        <input
          value={details.tagline ?? ""}
          maxLength={160}
          placeholder="Written for you if empty"
          onChange={(e) => set("tagline", e.target.value)}
          className={field}
        />
      </label>
      <label className="block text-sm text-muted sm:col-span-2">
        Logline for the library
        <textarea
          value={details.logline}
          maxLength={600}
          rows={3}
          onChange={(e) => set("logline", e.target.value)}
          className={`${field} resize-none leading-relaxed`}
        />
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm sm:col-span-2">
        <span className="relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center">
          <input
            type="checkbox"
            checked={details.show_prompt}
            onChange={(e) => set("show_prompt", e.target.checked)}
            className="peer absolute inset-0 cursor-pointer opacity-0"
          />
          <span className="pointer-events-none h-6 w-10 rounded-full bg-ink/15 transition-colors duration-150 peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
          <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-ink shadow transition-transform duration-200 ease-out peer-checked:translate-x-4 peer-checked:bg-midnight" />
        </span>
        <span>
          <span className="text-ink">Show my prompt on the homepage</span>
          <span className="mt-0.5 block line-clamp-1 text-xs text-muted">&ldquo;{prompt}&rdquo;</span>
        </span>
      </label>
    </div>
  );
}

function LookPicker({ value, onChange }: { value: PosterLook; onChange: (l: PosterLook) => void }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm text-muted">Poster look</legend>
      <div role="radiogroup" aria-label="Poster look" className="grid grid-cols-2 gap-2">
        {LOOKS.map((l) => {
          const on = value === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(l.id)}
              className={`press relative flex items-center gap-3 rounded-2xl p-2.5 text-left transition-[background-color,box-shadow] duration-150 ${
                on
                  ? "bg-accent/[0.08] shadow-[0_0_0_1.5px_var(--color-accent)]"
                  : "bg-ink/[0.03] shadow-[0_0_0_1px_var(--color-line)] hover:bg-ink/[0.06]"
              }`}
            >
              <span
                aria-hidden="true"
                className="grid h-11 w-9 shrink-0 place-items-center overflow-hidden rounded-lg text-[13px] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
                style={{ background: l.swatch }}
              >
                <span className={l.title.replace(/text-\[\d+px\]/, "")}>Aa</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{l.label}</span>
                <span className="block truncate text-xs text-muted">{l.note}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function FramePicker({
  frames,
  value,
  onChange,
  src,
}: {
  frames: number[];
  value: number;
  onChange: (n: number) => void;
  src: (n: number) => string | null;
}) {
  if (frames.length < 2) return null;
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm text-muted">Frame to build it from</legend>
      <div role="radiogroup" aria-label="Poster frame" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {frames.map((n) => {
          const on = value === n;
          const s = src(n);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`Scene ${n}`}
              onClick={() => onChange(n)}
              className={`press relative h-[86px] w-12 shrink-0 overflow-hidden rounded-lg transition-[box-shadow,opacity] duration-150 ${
                on ? "shadow-[0_0_0_2px_var(--color-accent)]" : "opacity-60 shadow-[0_0_0_1px_var(--color-line)] hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed API media */}
              {s && <img src={s} alt="" loading="lazy" className="h-full w-full object-cover" />}
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 font-mono text-[10px] text-white">{n}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
