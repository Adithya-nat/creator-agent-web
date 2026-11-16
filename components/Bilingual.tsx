/** Tamil film text in the (English) app UI: the original, exactly as it appears in
 *  the film, with its English rendering right under it. English films (or Tamil
 *  strings without a rendering yet) show the original alone. */
export function Bilingual({
  text,
  en,
  tamil,
  className = "",
  enClassName = "text-xs text-muted",
}: {
  text: string;
  en?: string | null;
  tamil?: boolean;
  className?: string;
  enClassName?: string;
}) {
  const showEn = tamil && en && en.trim() && en.trim() !== text.trim();
  return (
    <>
      <span lang={tamil ? "ta" : undefined} className={`${tamil ? "font-tamil" : ""} ${className}`}>
        {text}
      </span>
      {showEn && (
        <span lang="en" className={`mt-0.5 block font-sans italic ${enClassName}`}>
          {en}
        </span>
      )}
    </>
  );
}
