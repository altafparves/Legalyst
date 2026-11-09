# Meta Model API research (KBLI Profiler, Step 1)

Date: 2026-11-09
Author: Calvin
Sources: https://dev.meta.ai/platform/models, Meta docs "Models" page, Meta docs "Pricing and rate limits" page, Meta docs search for "embedding", Google Gemini embeddings docs (for option d only)

## 1. Summary

- Chosen chat model: **muse-spark-1.3** (Standard mode)
- Embeddings model on Meta: **NOT FOUND** (blocker, see section 5)
- Connection: base_url `https://api.meta.ai/v1`, auth `Authorization: Bearer <key>`, OpenAI-compatible
- The shared key works from my account. Indonesia is allowed under the Geographic Use Policy.
- Cost: Spark 1.3 is the cheapest current standard model. At assumed volumes the whole project is about $203, slightly above the USD 150 credit (section 4). Volumes are guesses, to confirm with Altaf.

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
- Env vars (names only, values stay in the local `.env`): `META_API_KEY`, `META_BASE_URL`, `META_MODEL`, `META_EMBED_MODEL`
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

Measured on the 5 descriptions (`max_tokens=3000`, task: summarize in one sentence):

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
| Profiler re-ranking (description + 5 candidates) | 800 / 600 | about $0.0036 | 10,000 | about $36 |
| RAG chatbot answer | 3,000 / 1,500 | about $0.010 | 10,000 | about $101 |
| Document draft | 2,000 / 2,500 | about $0.013 | 5,000 | about $66 |
| **Total** | | | | **about $203** |

- At these assumed volumes the project is above the USD 150 credit. Development and testing will use far less than these numbers.
- The same workloads on muse-wonder-1.0 would cost roughly 3x more, so it is not an option.
- In Contributor mode the same workloads would cost about $12 in total (about 20x cheaper), but Meta trains on our inputs and outputs.

Ways to reduce cost:
1. Use the LLM only when needed. Embeddings or BM25 can pick the top 3 for almost nothing, and the LLM only re-ranks when the match is weak. This is the largest saving.
2. Check for a reasoning-effort setting in the Chat Completions docs to reduce thinking tokens. TODO: search the docs for "reasoning" and note the parameter name and allowed values (or write "not found").
3. Contributor mode for development and testing with synthetic data only, if Altaf approves.
4. Keep system prompts fixed. Repeated prefixes are billed at the cached rate ($0.15 per 1M instead of $1.25), but input is the smaller part of our cost.
5. Web search grounding costs an extra $2.50 per 1,000 queries if we ever enable it.

## 6. Embeddings: NOT FOUND (blocker)

Checked:
1. Models page (https://dev.meta.ai/platform/models), all modality filters: Chat, Image, Audio, Segment, Other. "Other" only contains Muse Spark Open and Muse Glimmer, which are open-weight download models.
2. Docs "Models" page, "Models at a glance" table. Endpoints listed: Responses, Chat Completions, Messages, Image generation, Transcribe, Segmentation. No embeddings endpoint.
3. Docs search for "embedding". Only incidental mentions (agent frameworks, SAM predictor, inference and fine-tuning pages). No embeddings API.

Per the ticket, Step 2 is stopped and no fallback is used until Altaf decides. No credit has been spent on a workaround.

Options for the discussion:

| Option | Expected quality | Cost | Setup effort | Notes |
|---|---|---|---|---|
| (a) bge-m3 in-process (library only) | Strong multilingual | Free | Medium. About 2 GB model download, slower on CPU | Likely 1024 dims, so `vector(1536)` needs a migration |
| (b) LLM-only with muse-spark-1.3 over a BM25 shortlist | Good if the shortlist contains the answer | About $0.004 per request | Low | No new provider, but the most expensive per request |
| (c) Separate embedding service | Depends on the model | Hosting cost | High | Needs Altaf's approval (we decided not to deploy models) |
| (d) Google AI Studio gemini-embedding-001 | Strong multilingual (100+ languages) | $0.15 per 1M input tokens, free tier with low limits | Low | Output size is configurable and 1536 is a recommended size, so it fits `vector(1536)` with no migration. Second provider, needs approval. |

TODO for option (d): verify on ai.google.dev the free-tier data-use policy and whether vectors need normalizing at sizes below 3072.

## 7. Flags

1. Contributor models train on our inputs and outputs, have a 150 RPM limit, and are "available in select countries". Not used unless Altaf approves. Legalyst will later handle KTP, NPWP, and business details.
2. Muse Spark Open and Muse Glimmer require self-hosting, which conflicts with the ticket's no-deploy rule.
3. My account showed "No payment method on file", but the shared key worked with no billing error, so the banner does not block requests.
4. Reasoning models need a large `max_tokens` (see section 3).
5. Conflicts with `docs/ai-stack.md`: TODO (write "none found" or list the differences after reading that file).

## 8. Decision

Use **muse-spark-1.3** for re-ranking, the chatbot, and document drafts. It is the current recommended Spark version, the same quality as Muse Wonder in my test, and about 3x cheaper per call. Contributor mode is a possible further saving if Altaf approves it.

## 9. Results to add later

## BM25 baseline (data/kbli_eval.csv, 20 rows)

- Top-1: 12/20 = 60%
- Top-3: 15/20 = 75% (target was about 80%)
- Text rule: judul + " " + deskripsi, lowercase word tokens, BM25Okapi (rank-bm25)
- Misses (expected code not in top 3): ayam geprek resto (56101), pecel lele tenda (56102), warung kelontong (47112), baju via Instagram/Shopee (47711), toko skincare (47724)
- Cause: vocabulary mismatch. Users say "skincare", "pecel lele", "kelontong", "baju", which are not in the official descriptions, and generic words ("jual", "toko", "kecil") match unrelated codes. This is what semantic matching should fix.
- Embedding option chosen by Altaf and its accuracy: TODO