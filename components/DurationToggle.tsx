"use client";

import { Segmented } from "@/components/ui/Segmented";
import type { Duration } from "@/lib/types";

export function DurationToggle({
  value,
  onChange,
  disabled,
}: {
  value: Duration;
  onChange: (d: Duration) => void;
  disabled?: boolean;
}) {
  return (
    <Segmented
      id="duration"
      label="Video length"
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={[
        { value: 30, label: "30s" },
        { value: 60, label: "60s" },
      ]}
    />
  );
}
