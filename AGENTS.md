# Legalyst: project memory

Compliance checklist app for Indonesian micro/small F&B and retail businesses. Flow: business profile → KBLI match → compliance checklist → draft documents.

## Standing decisions

- **No Azure.** The department Azure account is not available. Do not add Azure SDKs, Azure OpenAI, App Service, Azure Queue, or Azure Blob. See [docs/infra.md](docs/infra.md) and [docs/ai-stack.md](docs/ai-stack.md).
- **Cloud & Hosting Stack (Option A — Free Tier):**
  - **Frontend:** **Vercel** (Next.js in `frontend/`).
  - **Backend API:** **Render** (Dockerized FastAPI in `backend/`) with a scheduled GitHub Actions keep-alive ping to `GET /health`.
  - **Database + Vector Store:** **Supabase PostgreSQL + `pgvector`** (`DATABASE_URL` via SQLAlchemy + Alembic; local dev stays on `docker-compose.yml`).
  - **File Storage:** **Supabase Storage** (`generated-documents` bucket for generated PDFs, replacing Azure Blob `#32`).
  - **Async Jobs:** **FastAPI `BackgroundTasks`** in-process (replacing Azure Queue `#32`).
- **AI = Meta developer platform API** (dev.meta.ai, about USD 150 credit) for generation and chat (`muse-spark-1.3`), with Google AI (`gemini-2.5-flash`) as fallback. No self-hosted or separately deployed models (no Fireworks, Together, vLLM) and no OpenRouter. Keep `base_url` and model name configurable via env vars. Embeddings: Google AI (`gemini-embedding-001` with `output_dimensionality=1536`, L2-normalized). See [docs/ai-stack.md](docs/ai-stack.md).
- **RAG, not training.** No model is trained or fine-tuned.
- **Database schema:** `regulation_chunks.embedding` is `vector(1536)` and needs a migration if the embedding model dimension ever changes (see [docs/schema.md](docs/schema.md)).
- **Data:** the obligations corpus follows `data/TEMPLATE_obligations.csv` and `data/README.md`. Each row needs `source_url` and `source_article`.
- **KBLI:** use KBLI 2025 (`data/kbli_2025.csv`), 5-digit codes.

