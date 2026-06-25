#!/usr/bin/env bash
# Build the rules-lookup artifacts from the rulebook PDF:
#   rules/pages/NNNN.webp  — one image per page (on-demand fetch by the app)
#   rules/index.json       — per-page text (full-text search) + curated keyword->page map
#
# Personal-use tooling around the user's own PDF; nothing here is redistributed.
# Requires: poppler (pdfinfo/pdftotext/pdftoppm), cwebp, node.
set -euo pipefail
cd "$(dirname "$0")"

PDF="${1:-fh-rule-book.pdf}"
OUT="rules"
PAGES="$OUT/pages"
DPI="${DPI:-130}"     # ~1140px wide for a ~8.7in page — crisp on phone, zoomable
Q="${Q:-80}"          # webp quality

[ -f "$PDF" ] || { echo "PDF not found: $PDF" >&2; exit 1; }
for t in pdfinfo pdftotext pdftoppm cwebp node; do
  command -v "$t" >/dev/null || { echo "missing tool: $t" >&2; exit 1; }
done

N=$(pdfinfo "$PDF" | awk '/^Pages:/{print $2}')
echo "rulebook: $N pages  (dpi=$DPI q=$Q)"

rm -rf "$OUT"; mkdir -p "$PAGES"

# 1) render every page to PNG (one pass), then compress each to webp
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "rendering pages..."
pdftoppm -png -r "$DPI" "$PDF" "$tmp/p"
for f in "$tmp"/p-*.png; do
  base="${f##*/p-}"; num="${base%.png}"        # poppler zero-pads to page-count width
  printf -v out "%04d" "$((10#$num))"
  cwebp -quiet -q "$Q" "$f" -o "$PAGES/$out.webp"
done
echo "pages: $(ls "$PAGES" | wc -l | tr -d ' ')  size: $(du -sh "$PAGES" | cut -f1)"

# 2) build the search index (per-page text + curated keyword map)
node build-index.js "$PDF" "$N" > "$OUT/index.json"
echo "index.json: $(wc -c < "$OUT/index.json" | tr -d ' ') bytes"
echo "done -> $OUT/"
