# Future direction — AI rulebook Q&A

A possible next evolution: instead of (or alongside) keyword search, let a player **type a
natural-language question** ("can I move through an ally's hex?", "how does Brittle work with
Shield?") and get a written answer **with page citations**, built from the rulebook itself
(retrieval-augmented generation — RAG).

This is **optional and additive**. Keyword search + on-demand page images are the baseline and
must keep working with zero backend. AI Q&A layers on top and should **degrade gracefully** — if
the AI service is unavailable, the chat box simply greys out and everything else still works.

## Why this can't live on GitHub Pages (as-is)

GitHub Pages serves **static files only** — no server-side code, no API endpoint, no place to
hold a model or an API key. The current deploy is perfect for the app as it stands, but a live
LLM answer needs **compute somewhere**. Three ways to get it, two of which mean moving off (or
adding something beside) Pages:

| Option | Where the LLM runs | Stays on GitHub Pages? | Trade-offs |
|---|---|---|---|
| **A. Self-hosted backend** | Any always-on machine you control (small server, old PC, mini-PC, VPS) running a local model (Ollama / llama.cpp) + a RAG service exposing `/api/ask` | Frontend can stay on Pages and call the backend cross-origin (CORS), or you front both with one reverse proxy | Full control, private, no per-query cost. You run/patch a box. Model quality bounded by that hardware. |
| **B. Serverless + hosted LLM** | A small function (Cloudflare Workers/Pages Functions, Vercel, Netlify Functions) does RAG retrieval and calls a hosted LLM API | No — migrate the static site to a platform that *also* runs functions (e.g. Cloudflare Pages, Vercel) | Cheap/no infra to maintain, strong models. Per-query cost; sends rulebook text to a third-party vendor (see copyright note). |
| **C. Fully in-browser** | Model runs client-side (WebLLM / transformers.js); a prebuilt vector index ships as a static asset | **Yes** — no server at all | Stays free + static + private. But large model download per visitor and weaker small models; heavy on phones (the main target). |

Rough recommendation: **A** if you want quality + privacy and don't mind running a box; **B** if
you want least-maintenance and best answers; **C** only if "must stay static and free" outweighs
answer quality. Decide when the feature is actually wanted.

## RAG shape (host-independent)

The retrieval pipeline is the same regardless of where it runs:

1. **Corpus already exists** — `rules/index.json` holds per-page rulebook text (`pages[].t`) built
   in step 1. Reuse it; no new extraction needed.
2. **Chunk** the page text into passages (keep page numbers attached for citations).
3. **Embed** each chunk with a small embedding model → store vectors (e.g. sqlite-vec, FAISS,
   or an in-memory store for a corpus this small — it's ~84 pages).
4. **Query time**: embed the question → retrieve top-k nearest chunks → feed them to an LLM with a
   "answer only from these passages, cite page numbers" prompt → return answer + page links.
5. **UI**: a chat box in the app; answers link straight to the existing on-demand page viewer.

The index is tiny, so the vector store and retrieval are cheap anywhere — the only heavy part is
the generative model, which is what drives the hosting choice above.

## Things to decide when picking this up

- **Hosting option A / B / C** — the main fork; sets everything else.
- **Embedding model + store** — e.g. `bge-small` / `all-MiniLM` + sqlite-vec or FAISS (a flat
  in-memory index is fine at this scale).
- **Generative model** — sized to the host: GPU → 7–14B comfortably; CPU-only → 3–7B; hosted API →
  whatever the vendor offers; in-browser → a quantized small model.
- **Availability** — if the backend isn't always on (e.g. a PC that sleeps), plan on-demand
  wake or accept the chat being offline; the graceful-degrade design already covers this.
- **Copyright** — option B sends rulebook text to a third-party LLM vendor on every query (their
  ToS/retention applies). Options A and C keep the text on hardware you control. Same Cephalofair
  copyright caveat as the rest of the project applies to whatever you stand up.
