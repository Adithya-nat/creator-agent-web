"use client";

const EXAMPLES = [
  "a lonely robot finds a flower",
  "a lighthouse keeper befriends a storm",
  "the last bookstore on Mars",
];

const MIN = 3;
const MAX = 2000;

export function PromptBar({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const tooShort = value.trim().length > 0 && value.trim().length < MIN;
  return (
    <div className="w-full">
      <div className="group relative rounded-2xl border border-line bg-surface/70 shadow-lift backdrop-blur-xl transition focus-within:border-accent/50">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX))}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          disabled={disabled}
          rows={3}
          aria-label="Describe your short film"
          placeholder="a lonely robot finds a flower…"
          className="relative block w-full resize-none rounded-2xl bg-transparent px-5 py-4 text-lg text-ink placeholder:text-muted/60 focus:outline-none disabled:opacity-60"
        />
        <div className="relative flex items-center justify-between px-5 pb-3 text-xs text-muted">
          <span>
            {tooShort ? (
              <span className="text-state-warn">at least {MIN} characters</span>
            ) : (
              <span className="hidden sm:inline">⌘/Ctrl + Enter to generate</span>
            )}
          </span>
          <span className={value.length > MAX - 100 ? "text-state-warn" : ""}>
            {value.length}/{MAX}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => onChange(ex)}
            className="rounded-full border border-line bg-surface/40 px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
