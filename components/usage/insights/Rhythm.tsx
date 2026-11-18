"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { EASE } from "@/components/production/motion";
import { Panel } from "@/components/usage/insights/Section";
import { formatUSD } from "@/lib/format";
import { calendarWeeks, hourLabel, intensity, localISO, rhythm, WEEKDAYS, type CalendarCell } from "@/lib/insights";
import type { StudioStats, UsageScope } from "@/lib/types";

// Tungsten light: one hue, brighter = busier. Level 0 is the empty frame.
const LEVEL = ["bg-ink/[0.05]", "bg-accent/30", "bg-accent/50", "bg-accent/75", "bg-accent"];

function describe(c: CalendarCell): string {
  const day = new Date(`${c.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  if (!c.runs) return `${day} · nothing made`;
  return `${day} · ${c.runs} ${c.runs === 1 ? "run" : "runs"} · ${c.films} ${c.films === 1 ? "film" : "films"} · ${formatUSD(c.cost_usd)}`;
}

/**
 * A year of making, one cell per day. Hover or tap a day to read it in the line above the
 * grid (no floating tooltip to chase). The grid sweeps in left to right, oldest first.
 */
export function ActivityCalendar({ stats, scope }: { stats: StudioStats; scope: UsageScope }) {
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  // Watch the scroller, not the grid: a clip-path'd grid has no visible area to observe.
  const seen = useInView(scroller, { once: true, margin: "-40px" });
  const weeks = useMemo(() => calendarWeeks(stats.activity), [stats.activity]);
  const max = Math.max(0, ...stats.activity.map((d) => d.runs));
  const [picked, setPicked] = useState<CalendarCell | null>(null);
  const today = localISO(new Date());
  const yearDays = stats.activity.filter((d) => d.runs > 0).length;

  // On narrow screens the year is wider than the card: start at today, scroll back for history.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const months = weeks.map((w, i) => {
    const first = new Date(`${w[0].date}T12:00:00`);
    const prev = i > 0 ? new Date(`${weeks[i - 1][0].date}T12:00:00`) : null;
    return !prev || prev.getMonth() !== first.getMonth() ? first.toLocaleDateString(undefined, { month: "short" }) : "";
  });

  return (
    <Panel
      kicker={scope === "me" ? "Your year" : "The studio's year"}
      title={`${yearDays} active ${yearDays === 1 ? "day" : "days"} in the last year`}
      aside={<span className="inline-flex items-center gap-1.5">Less {LEVEL.map((l) => <span key={l} className={`size-2.5 rounded-[3px] ${l}`} />)} More</span>}
    >
      <p className="mb-3 min-h-5 text-sm tabular-nums text-ink/90" aria-live="polite">
        {picked ? describe(picked) : <span className="text-muted">Hover or tap a day to see what was made.</span>}
      </p>
      <div ref={scroller} className="scroll-thin -mx-1 overflow-x-auto px-1 pb-1" onMouseLeave={() => setPicked(null)}>
        <motion.div
          className="inline-grid min-w-full grid-flow-col gap-[3px]"
          style={{ gridTemplateColumns: `24px repeat(${weeks.length}, minmax(11px, 1fr))` }}
          initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 100% 0 0)" }}
          animate={seen ? (reduce ? { opacity: 1 } : { clipPath: "inset(0 0% 0 0)" }) : undefined}
          transition={{ duration: reduce ? 0.3 : 1, ease: EASE }}
          role="img"
          aria-label={`${yearDays} active days in the last year; busiest day had ${max} ${max === 1 ? "run" : "runs"}.`}
        >
          <div className="grid grid-rows-[14px_repeat(7,minmax(11px,1fr))] gap-[3px] text-[10px] leading-[11px] text-muted" aria-hidden="true">
            <span />
            {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          {weeks.map((w, wi) => (
            <div key={w[0].date} className="grid grid-rows-[14px_repeat(7,minmax(11px,1fr))] gap-[3px]" aria-hidden="true">
              <span className="whitespace-nowrap text-[10px] leading-[14px] text-muted">{months[wi]}</span>
              {w.map((c) => (
                <span
                  key={c.date}
                  className={`aspect-square rounded-[3px] transition-[outline-color] duration-150 ${c.future ? "opacity-0" : LEVEL[intensity(c.runs, max)]} ${
                    c.date === today ? "outline outline-1 outline-offset-1 outline-ink/50" : ""
                  } ${picked?.date === c.date ? "outline outline-1 outline-offset-1 outline-ink" : ""}`}
                  onMouseEnter={() => !c.future && setPicked(c)}
                  onClick={() => !c.future && setPicked(c)}
                />
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </Panel>
  );
}

const CELL = 18;

/** When runs start, by weekday and hour, in your own timezone. Dot size = how many. */
export function Punchcard({ stats, scope, tz }: { stats: StudioStats; scope: UsageScope; tz: string }) {
  const reduce = useReducedMotion();
  const r = rhythm(stats.punchcard);
  const max = Math.max(1, ...stats.punchcard.flat());
  const who = scope === "me" ? "You make" : "The studio makes";
  return (
    <Panel
      kicker="When the work happens"
      title={r ? `${who} the most on ${r.day} ${r.part}` : "No runs yet"}
      aside={r ? `${Math.round(r.dayShare * 100)}% of runs start on ${r.day}s · busiest hour ${hourLabel(r.peakHour)} · ${tz.replace(/_/g, " ")}` : undefined}
    >
      <svg viewBox={`0 0 ${30 + 24 * CELL} ${7 * CELL + 16}`} className="w-full" role="img"
           aria-label={r ? `Busiest on ${r.day} ${r.part}, peak hour ${hourLabel(r.peakHour)}.` : "No runs yet."}>
        {WEEKDAYS.map((d, wi) => (
          <text key={d} x={0} y={wi * CELL + CELL / 2 + 4} className="fill-muted text-[10px]">{d.slice(0, 3)}</text>
        ))}
        {[0, 6, 12, 18].map((h) => (
          <text key={h} x={30 + h * CELL + CELL / 2} y={7 * CELL + 12} textAnchor="middle" className="fill-muted text-[10px]">{hourLabel(h)}</text>
        ))}
        {stats.punchcard.map((row, wi) =>
          row.map((n, h) => {
            const cx = 30 + h * CELL + CELL / 2;
            const cy = wi * CELL + CELL / 2;
            if (!n) return <circle key={`${wi}-${h}`} cx={cx} cy={cy} r={1.2} className="fill-ink/15" />;
            const radius = 3 + (n / max) * (CELL / 2 - 3.5);
            return (
              <motion.circle
                key={`${wi}-${h}`}
                cx={cx}
                cy={cy}
                r={radius}
                className="fill-accent"
                style={{ fillOpacity: 0.45 + (n / max) * 0.55, transformBox: "fill-box", transformOrigin: "center" }}
                initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={reduce ? { duration: 0.3 } : { type: "spring", duration: 0.5, bounce: 0, delay: 0.15 + h * 0.02 }}
              >
                <title>{`${WEEKDAYS[wi]} ${hourLabel(h)}: ${n} ${n === 1 ? "run" : "runs"}`}</title>
              </motion.circle>
            );
          }),
        )}
      </svg>
    </Panel>
  );
}
