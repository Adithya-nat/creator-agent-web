import { POSTERS } from "@/lib/posters";
import { mulberry32 } from "@/lib/rand";
import { SHOWCASE } from "@/components/studio/showcase";

type Tile = { key: string; src: string; tall: boolean };

const COLUMNS = [
  { dur: 95, dir: "up", offset: "0%" },
  { dur: 120, dir: "down", offset: "-18%" },
  { dur: 105, dir: "up", offset: "-34%" },
  { dur: 130, dir: "down", offset: "-9%" },
] as const;
const PER_COLUMN = 7;

/** Fixed seed, so the server and the browser draw the same wall (no hydration mismatch). */
function columns(): Tile[][] {
  const rnd = mulberry32(2026);
  const deck = [...POSTERS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return COLUMNS.map((_, c) => {
    const pool = deck.slice(c * PER_COLUMN, c * PER_COLUMN + PER_COLUMN).map<Tile>((p) => ({
      key: `p${p.id}`,
      src: p.src,
      tall: false,
    }));
    // One of our own films in every column, a third of the way down.
    const film = SHOWCASE[c % SHOWCASE.length];
    pool.splice(2, 0, { key: `f${film.id}`, src: film.poster, tall: true });
    return pool;
  });
}

const WALL = columns();

/** A tilted wall of posters drifting past, behind the studio's right side. Decorative. */
export function PosterDrift() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden opacity-[0.12] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_70%,transparent)] md:w-[54%] md:opacity-50 md:[mask-image:linear-gradient(to_right,transparent,black_55%),linear-gradient(to_bottom,transparent,black_16%,black_74%,transparent)] md:[mask-composite:intersect]"
    >
      <div className="absolute inset-0 [perspective:1600px]">
        <div className="absolute -inset-y-[20%] left-[6%] right-[-12%] flex gap-4 [transform:rotateY(-16deg)_rotateX(8deg)_rotateZ(4deg)] [transform-style:preserve-3d] sm:gap-5">
          {WALL.map((tiles, c) => (
            <div key={c} className="relative flex-1" style={{ marginTop: COLUMNS[c].offset }}>
              <div
                className="drift-col flex flex-col gap-4 sm:gap-5"
                data-dir={COLUMNS[c].dir}
                style={{ "--drift-dur": `${COLUMNS[c].dur}s` } as React.CSSProperties}
              >
                {[...tiles, ...tiles].map((t, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- small pre-sized webp tiles
                  <img
                    key={`${t.key}-${i}`}
                    src={t.src}
                    alt=""
                    loading={i < 3 ? "eager" : "lazy"}
                    decoding="async"
                    className={`block w-full rounded-xl object-cover outline outline-1 -outline-offset-1 outline-white/10 ${
                      t.tall ? "aspect-[9/16] shadow-[0_0_40px_-6px_rgba(242,181,68,0.45)]" : "aspect-[2/3]"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Warm projector light over the wall, plus a cool leak at the bottom. */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(242,181,68,0.10),transparent_70%),radial-gradient(50%_40%_at_90%_95%,rgba(110,231,249,0.08),transparent_70%)]" />
    </div>
  );
}
