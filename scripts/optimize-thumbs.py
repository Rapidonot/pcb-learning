"""Downscale raw thumbnail captures (premultiplied, so edges stay clean) and save as WebP with alpha.

usage: python3 scripts/optimize-thumbs.py <raw_dir> <out_dir> [id ...]
"""
import os
import sys

from PIL import Image

W, H = 480, 360
BUDGET = 120 * 1024


def optimise(src: str, dst: str) -> int:
    im = Image.open(src).convert("RGBA")
    # resize in premultiplied space so transparent edges don't pick up dark fringes
    im = im.convert("RGBa").resize((W, H), Image.LANCZOS).convert("RGBA")
    for q in (90, 86, 82, 78, 72):
        im.save(dst, "WEBP", quality=q, method=6, alpha_quality=100, exact=False)
        size = os.path.getsize(dst)
        if size <= BUDGET:
            break
    return size


def main() -> None:
    raw, out, *ids = sys.argv[1:]
    os.makedirs(out, exist_ok=True)
    if not ids:
        ids = [f[:-4] for f in sorted(os.listdir(raw)) if f.endswith(".png")]
    for i in ids:
        size = optimise(os.path.join(raw, f"{i}.png"), os.path.join(out, f"{i}.webp"))
        print(f"  {i}.webp  {size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
