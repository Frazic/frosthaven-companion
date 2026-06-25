# Frosthaven Companion — project memory / ops notes

Self-contained web companion for Frosthaven: HP/EXP tracker, virtual attack-modifier deck, and rulebook keyword lookup. Runs on a Raspberry Pi over HTTPS, used from phones on the LAN.

## What it is
- **`index.html`** — the entire app. Vanilla JS IIFE + inline CSS, no build, no deps. State in `localStorage` key `fh.companion.v1` (per-browser/per-device; server holds no game data).
- Features: per-character HP / Max HP / scenario XP; attack-modifier deck (standard + custom cards, bless/curse, advantage/disadvantage, rolling, effects); **📖 Rules** lookup overlay.

## Deployment (Raspberry Pi)
- SSH host: `josh.rpi`. Pi LAN IP: **192.168.1.23**. Hardware: **Pi 4 Model B, aarch64, 1.8GB RAM** (~1GB free, other services running), SD-card swap, ~7GB disk free.
- Container `frosthaven` (image `frosthaven-companion`), `nginx:1.27-alpine` (multi-arch, runs on aarch64). `restart: unless-stopped`, docker enabled on boot → survives reboot.
- Ports: **80** (health + 301→https) and **443** (the app, TLS).
- App dir on Pi: `~/frosthaven/`.

## Access
- Open **https://192.168.1.23/** on a LAN device.
- Self-signed cert → browser warns once: **Advanced → Proceed** (per browser). Cert SAN covers `192.168.1.23`, `raspberrypi.local`, `raspberrypi`, `localhost`, `127.0.0.1`.
- Use the **IP**, not `raspberrypi.local` — mDNS is flaky on some clients.
- HTTPS exists because Firefox (HTTPS-Only) and Edge (Automatic HTTPS) force http→https upgrades; plain-http port wouldn't load there.
- ERR_ADDRESS_UNREACHABLE seen earlier = client not actually on the Pi's LAN / VPN active — server was reachable from the LAN the whole time.

## TLS cert (Pi only — NOT in repo)
- `~/frosthaven/certs/fh.crt` + `fh.key` (key `chmod 600`). RSA 2048, 3650 days, generated on the Pi with the SAN above. `.dockerignore` + compose keep the key off the build context; bind-mounted read-only at runtime.

## Files
| File | Role | In image? |
|---|---|---|
| `index.html` | the app | **baked via Dockerfile COPY** → editing needs image rebuild |
| `nginx.conf` | 80=health+redirect, 443=TLS static | baked |
| `Dockerfile` | nginx + COPY index.html/nginx.conf + HEALTHCHECK | — |
| `docker-compose.yml` | ports, `certs` + `rules` bind-mounts | — |
| `.dockerignore` | `*` then `!index.html !nginx.conf` (certs/rules/pdf never in build ctx) | — |
| `build-rules.sh` | render PDF→webp pages + build search index | no |
| `build-index.js` | per-page text + curated keyword→page map (node) | no |
| `rules/` | `pages/NNNN.webp` (84) + `index.json` — **bind-mounted, ~18MB** | **no** → update without rebuild |
| `fh-rule-book.pdf` | source rulebook, 33MB, 84 pages (text layer, InDesign) | no |
| `STEP2-AI.md` | deferred local-AI plan | no |
| `certs/` | TLS (Pi only) | no |

## Update workflows
**App change** (index.html is baked into the image):
```bash
rsync -az index.html josh.rpi:~/frosthaven/
ssh josh.rpi 'cd ~/frosthaven && docker compose up -d --build'
```
**Rulebook change** (rules/ is bind-mounted → live, no rebuild):
```bash
./build-rules.sh                 # regenerates rules/ from fh-rule-book.pdf
rsync -az --delete rules/ josh.rpi:~/frosthaven/rules/
# files appear immediately in the container; hard-refresh the browser
```
**Health / verify:**
```bash
ssh josh.rpi 'docker inspect --format="{{.State.Health.Status}}" frosthaven'
ssh josh.rpi 'curl -sk -o /dev/null -w "%{http_code}\n" https://127.0.0.1/rules/index.json'
```

## Rules lookup architecture
- Build (on mac, needs `poppler` + `cwebp` + `node`; `gs` already present):
  - `pdftoppm -png -r 130` per page → `cwebp -q 80` → `rules/pages/NNNN.webp` (~110–450KB each, cover biggest).
  - `pdftotext -layout` (one pass, `\f`-split) → `build-index.js` → `rules/index.json`.
- `index.json` = `{ pageCount, pages:[{p,t}], terms:[{k, pages:[{p,c}]}] }`. `pages[].t` drives full-text search + snippets; `terms` = curated game-keyword → top pages by occurrence (keyword LIST is in `build-index.js`, page numbers computed from the PDF).
- Runtime: app fetches `rules/index.json` once (gzips ~80KB), searches client-side (curated jumps + full-text mentions), loads `rules/pages/NNNN.webp` **on demand** when a result is tapped. **The PDF itself is never served to phones.**
- nginx serves webp/json via default mime; `<img>` renders webp regardless. SPA fallback `try_files $uri /index.html` serves real assets directly (they exist).

## Gotchas learned
- Healthcheck uses `http://127.0.0.1/healthz` (IPv4). `localhost` resolves to `::1` (IPv6) and nginx listens IPv4 only → "connection refused".
- Local dev/test: `python3 -m http.server 8099` in this folder — `fetch('rules/index.json')` needs http(s), fails over `file://`. A `favicon.ico` 404 in console is harmless.
- Rules overlay: typing in the search bar while viewing a page snaps back to the results list (fixed; results pane is hidden during page view).
- Port history: 5001 (taken by household_items_tracker python) → 5002 → 80/443 for HTTPS.

## Step 2 — local AI Q&A (DEFERRED)
See **`STEP2-AI.md`**. Summary: RAG over the rulebook. Pi 4 (1.8GB, no GPU) **cannot** run a useful LLM → plan to run Ollama+RAG on a separate **Linux PC** (specs not yet gathered), Pi nginx reverse-proxies `/api/ask`, graceful-degrade if PC is off.
