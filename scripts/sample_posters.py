"""Sample a small, curated pool of movie posters for the 3D scenes.

Source: Hugging Face `skvarre/movie_posters-100k` (~95k TMDB posters, 43 GB).
We never download the whole thing:

  1. Read ONLY the text columns of the parquet shards over HTTP range requests
     (a few MB, ~2 min) and cache them locally.
  2. Pick posters: recognisable (popularity cutoff), on-brand (English + Tamil,
     no horror), with a release year.
  3. Fetch just those rows' images from the datasets-server, centre-crop to 2:3,
     resize to 320x480 and write small WebP files to public/posters/.
  4. Write lib/posterManifest.json, which the frontend imports, and pack all
     posters into one padded atlas (public/posters/atlas.webp +
     lib/posterAtlas.json) for the hero's single instanced draw call.

Usage (from the repo root, in a venv with `huggingface_hub pyarrow pillow`):
    python scripts/sample_posters.py --count 60 --seed 2026
"""

from __future__ import annotations

import argparse
import io
import json
import random
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO = "skvarre/movie_posters-100k"
META_COLUMNS = ["id", "title", "genres", "popularity", "release_date", "original_language"]
ROWS_API = "https://datasets-server.huggingface.co/rows"
EXCLUDED_GENRES = {"Horror", "Documentary", "TV Movie"}
W, H = 320, 480  # 2:3, ~2x the largest on-screen tile


def _read_shard(path: str) -> list[dict]:
    import pyarrow.parquet as pq
    from huggingface_hub import HfFileSystem

    # Range requests: pyarrow fetches only these columns' chunks, never the images.
    with HfFileSystem().open(path, block_size=1 << 20) as f:
        return pq.ParquetFile(f).read(columns=META_COLUMNS).to_pylist()


def load_meta(cache: Path) -> list[dict]:
    """Text columns for every row, in the datasets-server's row order.

    `load_dataset(REPO, streaming=True, columns=...)` still pulled image bytes
    (~1 GB per 7 min), so read the auto-converted parquet shards directly. They
    are the files the /rows API serves, so a row's index here is its offset there.
    """
    if cache.exists():
        return json.loads(cache.read_text())
    from concurrent.futures import ThreadPoolExecutor

    from huggingface_hub import HfFileSystem

    base = f"datasets/{REPO}@refs%2Fconvert%2Fparquet/default/train"
    shards = sorted(HfFileSystem().ls(base, detail=False), key=lambda p: int(p.rsplit("/", 1)[1].split(".")[0]))
    with ThreadPoolExecutor(max_workers=8) as pool:
        parts = list(pool.map(_read_shard, shards))
    rows = []
    for part in parts:
        for r in part:
            rows.append(
                {
                    "row": len(rows),
                    "id": r["id"],
                    "title": r["title"],
                    "genres": [g["name"] for g in (r["genres"] or [])],
                    "popularity": r["popularity"] or 0.0,
                    "year": (r["release_date"] or "")[:4],
                    "lang": r["original_language"],
                }
            )
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(rows))
    return rows


def pick(rows: list[dict], count: int, tamil_share: float, seed: int) -> list[dict]:
    def ok(r: dict) -> bool:
        return (
            r["year"].isdigit()
            and int(r["year"]) >= 1970
            and not EXCLUDED_GENRES.intersection(r["genres"])
        )

    en = [r for r in rows if ok(r) and r["lang"] == "en" and r["popularity"] >= 30]
    ta = [r for r in rows if ok(r) and r["lang"] == "ta" and r["popularity"] >= 4]
    def dedupe(rs: list[dict]) -> list[dict]:  # TMDB lists some films twice
        best: dict[str, dict] = {}
        for r in rs:
            k = r["title"].casefold()
            if k not in best or r["popularity"] > best[k]["popularity"]:
                best[k] = r
        return sorted(best.values(), key=lambda r: r["row"])

    en, ta = dedupe(en), dedupe(ta)
    rnd = random.Random(seed)
    # Oversample so dead rows / title mismatches can be skipped.
    n_ta = min(len(ta), round(count * tamil_share))
    return rnd.sample(ta, min(len(ta), n_ta * 2)) + rnd.sample(en, min(len(en), (count - n_ta) * 2))


def fetch_image(row: int, expect_title: str) -> bytes | None:
    q = urllib.parse.urlencode(
        {"dataset": REPO, "config": "default", "split": "train", "offset": row, "length": 1}
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(f"{ROWS_API}?{q}", timeout=30) as resp:
                data = json.load(resp)
            got = data["rows"][0]["row"]
            if got["title"] != expect_title:  # stream order != server order: skip, never mislabel
                return None
            with urllib.request.urlopen(got["image"]["src"], timeout=30) as resp:
                return resp.read()
        except Exception as e:  # noqa: BLE001 — network flakiness; retry then give up
            print(f"  row {row} attempt {attempt + 1}: {e}", file=sys.stderr)
            time.sleep(1.5 * (attempt + 1))
    return None


def to_webp(raw: bytes) -> bytes:
    from PIL import Image

    im = Image.open(io.BytesIO(raw)).convert("RGB")
    # Centre-crop to exactly 2:3 so no tile ever stretches.
    w, h = im.size
    if w / h > W / H:
        nw = round(h * W / H)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * H / W)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    out = io.BytesIO()
    im.resize((W, H), Image.LANCZOS).save(out, "WEBP", quality=72, method=6)
    return out.getvalue()


ATLAS_CELL = (256, 384)  # 2:3; the hero's largest tile renders ~190px wide
ATLAS_PAD = 8  # edge-extended gutter so mipmaps never bleed a neighbour in
ATLAS_NAME = "atlas.webp"


def build_atlas(chosen: list[dict], out: Path, meta_path: Path) -> None:
    """Pack every poster into one padded WebP: one request + one texture for
    the hero, which draws all its posters in a single instanced draw call."""
    import math

    from PIL import Image

    cw, ch, pad = *ATLAS_CELL, ATLAS_PAD
    sw, sh = cw + 2 * pad, ch + 2 * pad
    cols = math.ceil(math.sqrt(len(chosen) * sh / sw))
    rows = math.ceil(len(chosen) / cols)
    atlas = Image.new("RGB", (cols * sw, rows * sh), (20, 26, 46))
    for i, p in enumerate(chosen):
        im = Image.open(out / Path(p["src"]).name).convert("RGB")
        x, y = (i % cols) * sw, (i // cols) * sh
        atlas.paste(im.resize((sw, sh), Image.LANCZOS), (x, y))  # padding ≈ poster edge colours
        atlas.paste(im.resize((cw, ch), Image.LANCZOS), (x + pad, y + pad))
    atlas.save(out / ATLAS_NAME, "WEBP", quality=74, method=6)
    meta = {
        "src": f"/posters/{ATLAS_NAME}",
        "width": atlas.width,
        "height": atlas.height,
        "cols": cols,
        "cellW": cw,
        "cellH": ch,
        "pad": pad,
        "count": len(chosen),
    }
    meta_path.write_text(json.dumps(meta, indent=2) + "\n")
    print(f"atlas {atlas.width}x{atlas.height} -> {out / ATLAS_NAME}", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=60)
    ap.add_argument("--tamil-share", type=float, default=0.25)
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--cache", type=Path, default=Path(".cache/posters-meta.json"))
    ap.add_argument("--out", type=Path, default=Path("public/posters"))
    ap.add_argument("--manifest", type=Path, default=Path("lib/posterManifest.json"))
    ap.add_argument("--atlas-meta", type=Path, default=Path("lib/posterAtlas.json"))
    ap.add_argument("--atlas-only", action="store_true", help="rebuild the atlas from the current manifest")
    ap.add_argument("--exclude", type=Path, default=Path("scripts/poster-excludes.txt"), help="TMDB ids to skip, one per line (# comments ok)")
    args = ap.parse_args()

    if args.atlas_only:
        build_atlas(json.loads(args.manifest.read_text()), args.out, args.atlas_meta)
        return

    rows = load_meta(args.cache)
    print(f"{len(rows)} rows of metadata", file=sys.stderr)
    skip = set()
    if args.exclude and args.exclude.exists():
        skip = {int(line.split("#")[0]) for line in args.exclude.read_text().splitlines() if line.split("#")[0].strip().isdigit()}

    candidates = [c for c in pick(rows, args.count, args.tamil_share, args.seed) if c["id"] not in skip]
    n_ta_target = round(args.count * args.tamil_share)
    args.out.mkdir(parents=True, exist_ok=True)

    chosen: list[dict] = []
    per_lang = {"ta": 0, "en": 0}
    quota = {"ta": n_ta_target, "en": args.count - n_ta_target}
    for c in candidates:
        if per_lang[c["lang"]] >= quota[c["lang"]]:
            continue
        name = f"{c['id']}.webp"
        if not (args.out / name).exists():  # reuse earlier downloads: stable re-runs
            raw = fetch_image(c["row"], c["title"])
            if not raw:
                continue
            (args.out / name).write_bytes(to_webp(raw))
            time.sleep(0.4)  # stay under the datasets-server rate limit
        per_lang[c["lang"]] += 1
        chosen.append({"id": c["id"], "title": c["title"], "year": int(c["year"]), "lang": c["lang"], "src": f"/posters/{name}"})
        print(f"  [{len(chosen)}/{args.count}] {c['title']} ({c['year']}, {c['lang']})", file=sys.stderr)
        if len(chosen) >= args.count:
            break

    args.manifest.write_text(json.dumps(chosen, indent=2, ensure_ascii=False) + "\n")
    # Prune only after the new set is complete, so a running dev server never
    # serves a manifest entry whose file is missing.
    keep = {Path(p["src"]).name for p in chosen} | {ATLAS_NAME}
    for old in args.out.glob("*.webp"):
        if old.name not in keep:
            old.unlink()
    print(f"wrote {len(chosen)} posters -> {args.out}, manifest -> {args.manifest}", file=sys.stderr)
    build_atlas(chosen, args.out, args.atlas_meta)


if __name__ == "__main__":
    main()
