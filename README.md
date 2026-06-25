# Frosthaven Companion

Self-contained web companion for [Frosthaven](https://cephalofair.com/): per-character HP / XP tracker,
virtual attack-modifier deck (bless/curse, advantage/disadvantage, rolling, custom cards), and a
rulebook keyword lookup. Single `index.html` — vanilla JS, no build, no dependencies, no backend.
All game state lives in your browser's `localStorage`.

**Live:** https://frazic.github.io/frosthaven-companion/

## Run locally

```bash
python3 -m http.server 8099
# open http://localhost:8099  (rulebook fetch needs http(s), not file://)
```

## Deploy

Pushing to `main` triggers `.github/workflows/pages.yml`, which publishes the repo to GitHub Pages.
The same `index.html` + `rules/` also run on a Raspberry Pi over the LAN via Docker/nginx — see `NOTES.md`.

## Disclaimer

Unofficial, fan-made. Not affiliated with or endorsed by Cephalofair Games.
Frosthaven, its rulebook, and all related text and artwork are © 2023 Cephalofair Games, LLC.
All rights reserved. Rulebook pages are reproduced for personal player reference only — if you
represent Cephalofair and want this removed, open an issue and it will be taken down promptly.
