import { Mic, Speech, Volume2 } from "lucide-react";
import type { VoiceKind } from "@/lib/motionCoverage";

const ICON = { on_camera: Speech, narrator: Mic, off_screen: Volume2 };

export function VoiceIcon({ kind, className = "h-3.5 w-3.5" }: { kind: VoiceKind; className?: string }) {
  const Icon = ICON[kind];
  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
}
