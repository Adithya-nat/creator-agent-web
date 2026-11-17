import { Clapperboard, Image as ImageIcon, Lightbulb, Music, PenLine, Scissors, Users } from "lucide-react";

const STATIONS = [
  { label: "Brief", Icon: Lightbulb },
  { label: "Script", Icon: PenLine },
  { label: "Cast", Icon: Users },
  { label: "Frames", Icon: ImageIcon },
  { label: "Filming", Icon: Clapperboard },
  { label: "Score", Icon: Music },
  { label: "Cut", Icon: Scissors },
];

/** The production line as a strip of stations with a pulse of light running through it. */
export function AgentPipeline() {
  return (
    <div className="relative">
      <div className="absolute inset-x-6 top-[22px] h-px bg-line" aria-hidden="true">
        <div className="agent-track absolute inset-0 h-px" />
      </div>
      <ol className="relative grid grid-cols-7 gap-1" aria-label="What the agents do after you press Make the film">
        {STATIONS.map(({ label, Icon }, i) => (
          <li key={label} className="flex flex-col items-center gap-2.5 text-center">
            <span
              className="agent-node grid h-11 w-11 place-items-center rounded-2xl bg-midnight text-muted shadow-[0_0_0_1px_rgba(244,239,230,0.1)]"
              style={{ "--i": i } as React.CSSProperties}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-medium text-muted sm:text-xs">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
