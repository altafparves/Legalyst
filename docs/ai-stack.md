# AI stack decisions

Last updated: 2026-11-16

## 1. Azure is not available — Cloud & AI Refactor Summary

The department Azure account is **not available to this project and will not be**. All Azure dependencies from the original project brief and Sprint 0 issues have been replaced with zero-cost / free-tier cloud equivalents (see [docs/infra.md](infra.md) for the full infrastructure specification):

| Earlier Azure assumption | Replacement Decision & Status |
|---|---|
| #10 Azure OpenAI access (embeddings + chat) | **Replaced.** Use the **Meta Developer Platform API (`muse-spark-1.3`)** for chat/generation/reranking and **Google AI Studio (`gemini-embedding-001`)** for embeddings (below). |
| #34 "Generate KBLI embeddings via Azure OpenAI" | **Replaced & Done.** Re-scoped to Google AI `gemini-embedding-001` at 1536 dims, L2-normalized (#57, #63). |
| #5 Azure App Service + PostgreSQL Flexible Server | **Replaced.** **Supabase** (Managed PostgreSQL 16 + `pgvector`) for production/staging DB; **Render** (Dockerized FastAPI) for backend compute; local Docker (`docker-compose.yml`) for local dev. |
| #19 Deploy FE + BE to Azure staging | **Replaced.** **Vercel** for Next.js frontend + **Render** for FastAPI backend, deployed via GitHub Actions with an automated keep-alive health ping. |
| #32 Azure Blob Storage + Queue Storage | **Replaced.** **Supabase Storage** (`generated-documents` bucket) for generated compliance PDFs; **FastAPI `BackgroundTasks`** for async job execution. |
| #42 Billing question | **Resolved.** Covered by $0 free tiers (Vercel, Render, Supabase, Google AI Studio) plus the team's ~$150 Meta Developer API credit. |

## 2. Meta ecosystem for LLM generation & Google AI for embeddings

Decision: use the **Meta developer platform API** (https://dev.meta.ai/platform/models) for generation, the chatbot, re-ranking, and the AI Advisor. The project has about **USD 150 of credit** on this platform. Since the Meta developer platform does not offer an embeddings endpoint, use **Google AI (`gemini-embedding-001`)** for embeddings (#63).

- **Do not self-host or deploy models ourselves.** No Fireworks, Together, Groq, vLLM, or any "deploy Llama on our own infra" setup.
- **Do not use OpenRouter.** The credit is on Meta's platform, so routing through OpenRouter would spend money twice. (This supersedes the OpenRouter plan in #56.)
- **Chat / generation model choice:** `muse-spark-1.3` (`https://api.meta.ai/v1`), selected in #57 / PR #58 based on Bahasa Indonesia quality, price per token, and rate limits. Google AI Studio (`gemini-2.5-flash`) is the designated zero-cost fallback if Meta credits are exhausted.
- **Client:** keep an OpenAI-compatible or thin client wrapper with `base_url` and model name read from env vars, so the model can change without code changes.
- **Embeddings:** Meta developer platform does not offer an embeddings model (confirmed in #57). Approved fallback (#63): **Google AI Studio (`gemini-embedding-001`)** via `google-genai` with `output_dimensionality=1536` (L2-normalized) and appropriate `task_type` (`RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`), or a small open-source model running in-process if needed offline. Keep `GEMINI_API_KEY`, `GEMINI_EMBED_MODEL`, and `GEMINI_EMBED_DIM` configurable via env vars.
- **Vector search:** `pgvector` on **Supabase PostgreSQL** (production) and Docker Postgres (local dev) stays the vector store. FAISS or NumPy (`data/kbli_vectors.npy`) is fine for the offline prototype.
- **Budget:** keep a running estimate of credit use. Cache embeddings so the KBLI codebook is embedded once.

> [!NOTE]
> `regulation_chunks.embedding` is `vector(1536)`. Using `gemini-embedding-001` with `output_dimensionality=1536` fits the existing `vector(1536)` column and HNSW index directly without a schema migration (remember to L2-normalize truncated Matryoshka vectors). If an embedding model with a different dimension is ever used, add an Alembic migration first.

## 3. No model training

The chatbot and profiler are **RAG plus prompting**, not trained or fine-tuned models:

1. Business profiler: description → embedding → top-3 KBLI (needs `data/kbli_2025.csv`, which is done).
2. Compliance Q&A: retrieve from `obligations` / `regulation_chunks` and answer with citations (uses `data/obligations_oss.csv` from #13; #14/#15 pending).

"Data for training" therefore means the KBLI codebook, the obligations corpus, and the eval set (#36 / `data/kbli_eval.csv`).

## 4. Data readiness (for Calvin)

| Data | Owner | Ready? | Blocks |
|---|---|---|---|
| `data/kbli_2025.csv` (313 rows) | done (#12) | Yes | Profiler, #57, #63 |
| `data/obligations_oss.csv` (#13) | done (#60) | Yes | `pgvector` ingestion & OSS-RBA checklist (#63) |
| Obligations PIRT (#14), Halal + SPT (#15) | PM | **No** | Full PIRT/Halal/SPT chatbot answers |
| Eval examples (`data/kbli_eval.csv`, 20 rows) | Calvin (#57 / PR #58) | Yes | Profiler evaluation (#63) |
| Format agreement on the obligations template (#8) | group | Done | #13/#14/#15 consistency |

Calvin can build and ship the full profiler, `pgvector` ingestion, and RAG pipeline against `kbli_2025.csv` and `obligations_oss.csv` (#63).

