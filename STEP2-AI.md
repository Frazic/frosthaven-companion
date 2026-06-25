# Step 2 — Local AI rulebook Q&A (DEFERRED)

Goal: type a question, get an answer about Frosthaven rules with page citations. RAG over the rulebook PDF. Local only (no hosted API).

## Status
Deferred. Step 1 (keyword search + on-demand page images) comes first. Resume this when step 1 done.

## Architecture (decided)
- **Pi** (always-on, low power) keeps: web app + rulebook page-images + text search index. Already deployed at `~/frosthaven/`, served by nginx over HTTPS (ports 80→443).
- **PC** (beefier x86, maybe not always-on) runs AI backend: Ollama + RAG.
- Pi nginx reverse-proxies `/api/ask` → PC. PC offline = search/rulebook still work, only chatbot greys out (graceful degrade).
- RAG shape: chunk rulebook text → embed → vector store → on query: embed question, retrieve top-k chunks, feed small LLM, answer + page cites. Reuses the per-page text index built in step 1.

## Hardware facts
- **Pi 4 Model B**, aarch64, 1.8GB RAM (~1GB free, other services running), SD-card swap, 7.4GB disk free.
  - Verdict: CANNOT run a useful generative LLM (RAM + no GPU + SD swap = thrash). Embeddings-only semantic search *would* fit (~100-400MB model) if ever needed without the PC.
- **Linux PC** — old but decent CPU/RAM, potential GPU. SPECS NOT YET GATHERED. Run on it:
  ```bash
  echo "=== OS ==="; . /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"; uname -m
  echo "=== CPU ==="; nproc; grep -m1 "model name" /proc/cpuinfo | cut -d: -f2
  echo "=== RAM ==="; free -h | awk '/Mem:/{print $2" total, "$7" avail"}'
  echo "=== DISK ==="; df -h / | awk 'NR==2{print $4" free"}'
  echo "=== GPU ==="; lspci | grep -Ei "vga|3d|display"
  command -v nvidia-smi >/dev/null && nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
  ```

## Model sizing (pending PC specs)
- NVIDIA GPU → CUDA, easy; 7-14B fits comfortably with decent VRAM.
- AMD GPU → ROCm, trickier. Intel/none → CPU-bound, stick 3-7B.
- RAM is the ceiling for CPU inference; VRAM for GPU.

## Open questions for later
- PC always-on? If it sleeps, AI offline (consider Wake-on-LAN or on-demand).
- Embeddings model + vector store choice (e.g. bge-small + sqlite-vec / faiss).
- Serve backend: Ollama (simplest) vs llama.cpp server.

## Resume checklist
1. Confirm step 1 shipped (text index + page images on Pi).
2. Gather PC specs (command above).
3. Pick model + GPU runtime by specs.
4. Stand up Ollama + RAG on PC, expose `/api/ask`.
5. Add reverse-proxy on Pi nginx + chat box in app, graceful-degrade if PC down.
