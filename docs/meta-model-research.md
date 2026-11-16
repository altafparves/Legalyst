# Meta Model API research (KBLI Profiler, Step 1)

Date: 2026-11-09
Author: Calvin
Sources: https://dev.meta.ai/platform/models, Meta docs "Models" page, Meta docs "Pricing and rate limits" page, Meta docs search for "embedding", Google Gemini embeddings docs (for option d only)

## 1. Summary

- Chosen chat model: **muse-spark-1.3** (Standard mode)
- Embeddings model on Meta: **NOT FOUND** (blocker, see section 6). Resolved: Altaf approved Google AI gemini-embedding-001 (section 10).
- Connection: base_url `https://api.meta.ai/v1`, auth `Authorization: Bearer <key>`, OpenAI-compatible
- The shared key works from my account. Indonesia is allowed under the Geographic Use Policy.
- Cost: Spark 1.3 is the cheapest current standard model. At assumed volumes the whole project is about $183, slightly above the USD 150 credit (section 5). Volumes are guesses, to confirm with Altaf.

## 2. Candidate models

All chat models have a 1,048,576 token context window, accept text, image, video, audio and PDF input, and return text. Prices are per 1M tokens (confirmed on the pricing page).

| Model ID | Input | Cached input | Output | RPM / TPM (per team) | Notes |
|---|---|---|---|---|---|
| muse-spark-1.3 | $1.25 | $0.15 | $4.25 | 3,000 / 4M | Recommended by Meta for new work. **Chosen.** |
| muse-spark-1.2 | $1.25 | $0.15 | $4.25 | 3,000 / 4M | Older, same price. Not used. |
| muse-spark-1.1 | $1.25 | $0.15 | $4.25 | 3,000 / 4M | Older, same price. Not used. |
| muse-wonder-1.0 | $4.00 | $0.20 | $20.00 | 3,000 / 4M | In preview. About 3x the cost per call in my test, no quality gain. |
| muse-spark-1.3-contributor | $0.10 | $0.002 | $0.20 | 150 / 3M | About 20x cheaper, but Meta trains on our inputs and outputs. Needs Altaf's approval. Not tested. |
| muse-spark-1.2-contributor | $0.10 | $0.002 | $0.20 | 150 / 3M | Same as above. |

Not usable for us:
- Muse Wonder Full: Muse Code subscription only, not available through the API.
- Muse Spark Open and Muse Glimmer: open-weight, must be downloaded and self-hosted, which the ticket forbids.
- Muse Image, Muse Voice Transcribe, SAM 3.1: image generation, speech-to-text, and segmentation. Not relevant to the profiler.

## 3. Connection details

- base_url: `https://api.meta.ai/v1`
- Auth: `Authorization: Bearer <API key>`
- Endpoints for chat models: Responses, Chat Completions, Messages (the OpenAI Python SDK works with the base_url above)
- Model IDs: `muse-spark-1.3`, `muse-wonder-1.0`
- Env vars (names only, values stay in the local `.env`): `META_API_KEY`, `META_BASE_URL`, `META_MODEL`, `META_EMBED_MODEL`, `META_REASONING_EFFORT`
- Meta's docs call the key variable `MODEL_API_KEY`. We keep `META_API_KEY` as the ticket says.
- Rate limits are per team, not per key.
- On HTTP 429: retry with exponential backoff and jitter, and respect `Retry-After`.
- Important: both models are reasoning models. With `max_tokens=200` the whole budget was used for thinking and the reply text came back as `None`. With `max_tokens=3000` every call finished normally (`finish_reason: stop`). Use a generous `max_tokens` (at least 1000 to 3000) and always check `finish_reason`.

## 4. Quality test (Indonesian)

Script: `scripts/test_models.py`. 5 sample descriptions: coffee and bread warung, nasi padang warung, online clothing shop (Instagram/Shopee), nasi kotak catering for office and arisan, small minimarket with sembako.

- **muse-spark-1.3:** all 5 summaries correct and fluent. It understood warung, omzet, nasi kotak, arisan, sembako, and classified the businesses sensibly (for example "jasa boga" for catering, "ritel fashion online" for the clothing shop).
- **muse-wonder-1.0:** all 5 summaries correct and fluent, slightly more concise. No visible quality advantage for this task.
- Conclusion: quality is equal for our use, so the cheaper model wins.

## 5. Measured token use and cost

Formula: `input_tokens / 1M * input_price + output_tokens / 1M * output_price`

Measured on the 5 descriptions (`max_tokens=3000`, task: summarize in one sentence, default reasoning effort):

| | muse-spark-1.3 | muse-wonder-1.0 |
|---|---|---|
| Input tokens per call | 28 to 41 (average 33) | 28 to 41 (average 33) |
| Output tokens per call | 450 to 786 across two runs, average about 590 | 324 to 454, average 386 |
| Cost per call | about $0.0025 | about $0.0078 |
| Cost for the 5 calls | about $0.012 | about $0.039 |

Output tokens include the model's thinking, which is billed. A one-sentence answer used 300 to 800 output tokens, so reasoning is the main cost driver, not the prompt.

Projected workloads on muse-spark-1.3 (volumes are my assumptions, to confirm with Altaf):

| Workload | Tokens per call (in / out) | Cost per call | Volume | Total |
|---|---|---|---|---|
| Profiler re-ranking (description + 5 candidates, effort minimal, measured in section 11) | 228 / 317 | about $0.0016 | 10,000 | about $16 |
| RAG chatbot answer (assumption) | 3,000 / 1,500 | about $0.010 | 10,000 | about $101 |
| Document draft (assumption) | 2,000 / 2,500 | about $0.013 | 5,000 | about $66 |
| **Total** | | | | **about $183** |

- At these assumed volumes the project is above the USD 150 credit. Development and testing will use far less than these numbers.
- The profiler row is measured at `reasoning_effort=minimal`. At the default effort ("high") it would be about $0.0057 per query, about $57 at 10,000 requests. The chatbot and document-draft rows are still assumptions and will be re-measured in Phase 5.
- The same workloads on muse-wonder-1.0 would cost roughly 3x more, so it is not an option.
- In Contributor mode the same workloads would cost about $12 in total (about 20x cheaper), but Meta trains on our inputs and outputs.

Ways to reduce cost:
1. Use the LLM only when needed. Embeddings or BM25 can pick the top 3 for almost nothing, and the LLM only re-ranks when the match is weak. This is the largest saving.
2. Reasoning effort: verified on Meta's docs (Features > Reasoning). Chat Completions takes a top-level `reasoning_effort` ("minimal", "low", "medium", "high", "xhigh", "max"; "none" is not supported). Default for Muse Spark is "high". Measured result: minimal cuts output tokens by about 75% versus default with the same accuracy on the eval set (see the effort table in section 10).
3. Contributor mode for development and testing with synthetic data only, if Altaf approves.
4. Keep system prompts fixed. Repeated prefixes are billed at the cached rate ($0.15 per 1M instead of $1.25), but input is the smaller part of our cost.
5. Web search grounding costs an extra $2.50 per 1,000 queries if we ever enable it.

## 6. Embeddings: NOT FOUND on Meta (blocker, now resolved)

Checked:
1. Models page (https://dev.meta.ai/platform/models), all modality filters: Chat, Image, Audio, Segment, Other. "Other" only contains Muse Spark Open and Muse Glimmer, which are open-weight download models.
2. Docs "Models" page, "Models at a glance" table. Endpoints listed: Responses, Chat Completions, Messages, Image generation, Transcribe, Segmentation. No embeddings endpoint.
3. Docs search for "embedding". Only incidental mentions (agent frameworks, SAM predictor, inference and fine-tuning pages). No embeddings API.

Per the ticket, Step 2 was stopped and no fallback was used until Altaf decided. No credit was spent on a workaround. Altaf then approved option (d) in the follow-up ticket.

Options that were discussed:

| Option | Expected quality | Cost | Setup effort | Notes |
|---|---|---|---|---|
| (a) bge-m3 in-process (library only) | Strong multilingual | Free | Medium. About 2 GB model download, slower on CPU | Likely 1024 dims, so `vector(1536)` needs a migration |
| (b) LLM-only with muse-spark-1.3 over a BM25 shortlist | Good if the shortlist contains the answer | About $0.004 per request | Low | No new provider, but the most expensive per request |
| (c) Separate embedding service | Depends on the model | Hosting cost | High | Needs Altaf's approval (we decided not to deploy models) |
| (d) Google AI Studio gemini-embedding-001 | Strong multilingual (100+ languages) | $0.15 per 1M input tokens, free tier with low limits | Low | Output size is configurable and 1536 is a recommended size, so it fits `vector(1536)` with no migration. Second provider, needs approval. |

Option (d) verified: normalization is required below 3072 dimensions (tested in scripts/check_norm.py, see section 10), and on the free tier Google may use submitted content to improve its products (Gemini API Additional Terms), so real user data needs a billing-enabled key.

## 7. Flags

1. Contributor models train on our inputs and outputs, have a 150 RPM limit, and are "available in select countries". Not used unless Altaf approves. Legalyst will later handle KTP, NPWP, and business details.
2. Muse Spark Open and Muse Glimmer require self-hosting, which conflicts with the ticket's no-deploy rule.
3. My account showed "No payment method on file", but the shared key worked with no billing error, so the banner does not block requests.
4. Reasoning models need a large `max_tokens` (see section 3).
5. `docs/ai-stack.md` and a root `AGENTS.md`, both referenced in the ticket, are not in the repo (checked origin/main after merging, only `frontend/AGENTS.md` exists). I followed the constraints as written in the ticket.

## 8. Decision

Use **muse-spark-1.3** for re-ranking, the chatbot, and document drafts. It is the current recommended Spark version, the same quality as Muse Wonder in my test, and about 3x cheaper per call. Contributor mode is a possible further saving if Altaf approves it.

## 9. BM25 baseline and embedding choice

BM25 baseline (data/kbli_eval.csv, 20 rows):

- Top-1: 12/20 = 60%
- Top-3: 15/20 = 75% (target was about 80%)
- Text rule: judul + " " + deskripsi, lowercase word tokens, BM25Okapi (rank-bm25)
- Misses (expected code not in top 3): ayam geprek resto (56101), pecel lele tenda (56102), warung kelontong (47112), baju via Instagram/Shopee (47711), toko skincare (47724)
- Cause: vocabulary mismatch. Users say "skincare", "pecel lele", "kelontong", "baju", which are not in the official descriptions, and generic words ("jual", "toko", "kecil") match unrelated codes. This is what semantic matching should fix.

Embedding option chosen by Altaf: Google AI gemini-embedding-001 (1536 dims, approved in the follow-up ticket). Accuracy: Top-1 90%, Top-3 100% on the 20 eval rows (see section 11).

## 10. Google AI embeddings (gemini-embedding-001)

Approved by Altaf as the embeddings provider. Meta muse-spark-1.3 stays for generation and re-ranking.

### SDK usage
- Package: `google-genai`. `client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])`
- `client.models.embed_content(model=<GEMINI_EMBED_MODEL>, contents=[texts], config=types.EmbedContentConfig(task_type=..., output_dimensionality=1536))`
- A list in `contents` returns one embedding per text: `result.embeddings[i].values`.

### task_type
- RETRIEVAL_DOCUMENT: texts that are stored and searched (KBLI codebook, regulation chunks).
- RETRIEVAL_QUERY: what the user types (business description, compliance question).
- SEMANTIC_SIMILARITY: comparing two texts with each other. Not used here.
- Using DOCUMENT on one side and QUERY on the other is intended for retrieval.

### 1536 dimensions and normalization
- The default 3072-dim vector is already normalized. Truncated sizes (1536) are not, and Google's docs say to L2-normalize them.
- Tested with scripts/check_norm.py: length at 3072 = 1.0, length at 1536 = 0.69777554, after normalizing = 1.0.
- Decision: always L2-normalize after the API call (done inside embed()). With normalized vectors cosine similarity equals the dot product, and pgvector's cosine distance (<=>) is consistent.

### Limits, batching, privacy
- Free tier limits first found in a forum post (about 100 RPM, 30k TPM, 1,000 RPD), then verified in AI Studio (Default Gemini Project, free tier, checked 2026-11-15): gemini-embedding-001 ("Gemini Embedding 1") has RPM 100, TPM 30K, RPD 1K. This matches the forum numbers.
- The 313 KBLI rows are about 40k tokens, so embed() sends 20 texts per call, pauses between calls, and retries on 429 with exponential backoff.
- Free tier privacy: Google may use inputs and outputs to improve its products and humans may review them; Google's terms say not to send sensitive or personal information. Paid tier (billing enabled) does not use prompts for training.
- Consequence: the public KBLI codebook and regulation corpus are safe on the free tier. Real user descriptions and compliance questions need a billing-enabled key before production. Raised with Altaf.

### Reasoning effort (verified on Meta docs, Features > Reasoning)
- Chat Completions parameter: `reasoning_effort` (top level). Responses API uses `reasoning.effort`.
- Values: minimal, low, medium, high, xhigh, max. "none" is not supported by Muse Spark (HTTP 400).
- Default when omitted: "high" on every Muse Spark version. This explains the 450 to 800 output tokens per call in my first tests.
- Reasoning tokens are billed as output tokens and count toward max_tokens. Reported in `completion_tokens_details.reasoning_tokens`.
- Meta recommends "low" for direct-answer tasks. Re-ranking 5 candidates is one.

### Reasoning effort vs accuracy and cost (muse-spark-1.3 re-ranker, 20 rows, each setting run once)

| Effort | Embedding + re-rank (Top-1 / Top-3) | Hybrid + re-rank (Top-1 / Top-3) | Avg in / out tokens | Avg latency per call | Cost per query |
|---|---|---|---|---|---|
| high (default) | 100% (20/20) / 100% (20/20) | 90% (18/20) / 95% (19/20) | 228 / 1284 | 12.7 s | $0.0057 |
| low | 100% (20/20) / 100% (20/20) | 95% (19/20) / 95% (19/20) | 228 / 616 | 5.8 s | $0.0029 |
| minimal | 100% (20/20) / 100% (20/20) | 95% (19/20) / 95% (19/20) | 228 / 317 | 3.1 s | $0.0016 |

Token, latency, and cost figures are averages over 40 re-rank calls per setting (20 per method). Parameter: `reasoning_effort` on Chat Completions ("none" is not supported by Muse Spark).

Findings: lowering the effort did not change accuracy on this set but cut output tokens by 52% (low) and 75% (minimal) versus the default, and latency from 12.7 s to 3.1 s. Chosen setting: **minimal** (`META_REASONING_EFFORT=minimal`). Limits: 20 rows, each setting run once.

## 11. Accuracy and cost comparison (20 eval rows, data/kbli_eval.csv)

| Method | Top-1 | Top-3 | Added latency per query | Cost per query |
|---|---|---|---|---|
| BM25 only | 60% (12/20) | 75% (15/20) | about 1 ms | $0 |
| Google embedding only (gemini-embedding-001, 1536 dims) | 90% (18/20) | 100% (20/20) | 1.1 to 1.6 s (one embedding API call, 4 runs measured) | about $0.000005 (my estimate: about 30 tokens at $0.15 per 1M) |
| Hybrid (BM25 + embedding, RRF) | 85% (17/20) | 95% (19/20) | same as embedding | same as embedding |
| Hybrid + muse-spark-1.3 re-rank (top-5, effort minimal) | 95% (19/20) | 95% (19/20) | embedding + 3.1 s | $0.0016 |
| Embedding + muse-spark-1.3 re-rank (top-5 from embedding, effort minimal) | 100% (20/20) | 100% (20/20) | embedding + 3.1 s | $0.0016 |

Findings:
- Target met: embedding only reaches Top-3 = 100% (target was 80%).
- Hybrid is worse than embedding alone on this set. BM25 pushed the one row it got wrong (skincare shop, expected 47724) out of the top 3, and BM25 itself missed that row. BM25's weakness is vocabulary mismatch (skincare vs kosmetik, pecel lele, kelontong).
- Re-ranking embedding candidates raises Top-1 from 18/20 to 20/20 (two rows, 10 points). Re-ranking hybrid candidates cannot fix the skincare row, because its correct code was not among the 5 candidates.
- Re-ranking costs about $0.0016 and 3.1 s per query at reasoning_effort = minimal (see section 10 for the effort comparison).
- Limits: 20 rows is small and each row is 5 percentage points. The eval set was written before any tuning and no row was changed after seeing results. Each re-rank setting was run once.

Recommendation (for Altaf to decide): use embedding retrieval for the profiler. The user sees 3 codes and picks one, and embedding-only already has the correct code in the top 3 for all 20 rows. Use the re-ranker (effort minimal) only if the order of the 3 codes matters, since it adds about 3 s and $0.0016 per query. Don't use BM25 hybrid unless a larger eval set shows a benefit.

Update (measured): the profiler re-ranker with reasoning_effort=minimal averages 228 input / 317 output tokens, about $0.0016 per query. At my assumed 10,000 profiler requests that is about $16 (previously estimated $36 to $40 at default reasoning). The chatbot and document-draft rows are still assumptions and will be re-measured in Phase 5.

## 12. Manual test outputs (python scripts\matcher.py)

```
Saya jual kopi dan roti buatan sendiri di warung kecil, omzet sekitar 15 juta per bulan.
   {'kode': '47243', 'judul': 'Perdagangan Eceran Kopi, Gula Pasir, Gula Merah, dan Sejenisnya', 'score': 0.66}
   {'kode': '47242', 'judul': 'Perdagangan Eceran Roti, Kue Kering, Serta Kue Basah dan Sejenisnya', 'score': 0.65}
   {'kode': '56304', 'judul': 'Aktivitas Kedai Minuman', 'score': 0.64}

Saya jualan pecel lele di warung tenda pinggir jalan setiap malam.
   {'kode': '56102', 'judul': 'Aktivitas Penyediaan Makanan di Bangunan Tidak Tetap', 'score': 0.64}
   {'kode': '47592', 'judul': 'Perdagangan Eceran Peralatan Listrik Rumah Tangga, Peralatan Penerangan, dan Perlengkapannya', 'score': 0.63}
   {'kode': '47112', 'judul': 'Perdagangan Eceran Berbagai Macam Barang yang Utamanya Makanan, Minuman, atau Tembakau Selain dengan Sistem Swalayan', 'score': 0.63}

Buka toko skincare dan make up, produk dari brand lokal.
   {'kode': '47724', 'judul': 'Perdagangan Eceran Kosmetik untuk Manusia', 'score': 0.68}
   {'kode': '47728', 'judul': 'Perdagangan Eceran Kosmetik untuk Hewan', 'score': 0.63}
   {'kode': '47722', 'judul': 'Perdagangan Eceran Sediaan Farmasi untuk Manusia Selain di Apotek', 'score': 0.63}

Jualan baju lewat Instagram dan Shopee, barang dari supplier Tanah Abang.
   {'kode': '47711', 'judul': 'Perdagangan Eceran Pakaian', 'score': 0.63}
   {'kode': '47901', 'judul': 'Platform Digital Intermediasi Perdagangan Eceran', 'score': 0.62}
   {'kode': '47742', 'judul': 'Perdagangan Eceran Pakaian, Alas Kaki, dan Perlengkapan Pakaian Bekas', 'score': 0.62}

Warung kelontong di depan rumah jual sembako, rokok, dan minuman.
   {'kode': '47112', 'judul': 'Perdagangan Eceran Berbagai Macam Barang yang Utamanya Makanan, Minuman, atau Tembakau Selain dengan Sistem Swalayan', 'score': 0.7}
   {'kode': '47230', 'judul': 'Perdagangan Eceran Rokok dan Tembakau', 'score': 0.67}
   {'kode': '47111', 'judul': 'Perdagangan Eceran Berbagai Macam Barang yang Utamanya Makanan, Minuman, atau Tembakau dengan Sistem Swalayan', 'score': 0.67}

Terima katering nasi kotak untuk acara kantor dan arisan.
   {'kode': '56210', 'judul': 'Aktivitas Jasa Boga untuk Acara Tertentu (event Catering)', 'score': 0.67}
   {'kode': '56290', 'judul': 'Aktivitas Penyediaan Jasa Boga Lainnya', 'score': 0.66}
   {'kode': '10750', 'judul': 'Industri Makanan dan Masakan Olahan', 'score': 0.63}
```