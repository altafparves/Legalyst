# Legalyst: project memory

Compliance checklist app for Indonesian micro/small F&B and retail businesses. Flow: business profile → KBLI match → compliance checklist → draft documents.

## Standing decisions

- **No Azure.** The department Azure account is not available. Do not add Azure SDKs, Azure OpenAI, App Service, or Azure Blob. See [docs/ai-stack.md](docs/ai-stack.md).
- **AI = Meta developer platform API** (dev.meta.ai, about USD 150 credit) for generation and chat (`muse-spark-1.3`). No self-hosted or separately deployed models (no Fireworks, Together, vLLM) and no OpenRouter. Keep `base_url` and model name configurable via env vars. Embeddings: Google AI (`gemini-embedding-001` with `output_dimensionality=1536`) or a small open-source model running in-process. See [docs/ai-stack.md](docs/ai-stack.md).
- **RAG, not training.** No model is trained or fine-tuned.
- **Database:** Postgres + pgvector, local via `docker-compose.yml`. `regulation_chunks.embedding` is `vector(1536)` and needs a migration if the embedding model changes (see docs/ai-stack.md).
- **Hosting and file storage:** undecided.
- **Data:** the obligations corpus follows `data/TEMPLATE_obligations.csv` and `data/README.md`. Each row needs `source_url` and `source_article`.
- **KBLI:** use KBLI 2025 (`data/kbli_2025.csv`), 5-digit codes.

