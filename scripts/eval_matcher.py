import json
import os
import re
import time

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI

from baseline_bm25 import bm25, kbli, tokenize
from matcher import embed, load_vectors

load_dotenv()
PRICE_IN, PRICE_OUT = 1.25 / 1e6, 4.25 / 1e6   # muse-spark-1.3 per token
llm = OpenAI(base_url=os.environ["META_BASE_URL"], api_key=os.environ["META_API_KEY"])
RERANK_PROMPT = open("prompts/kbli_rerank.md", encoding="utf-8").read()
EFFORT = os.environ.get("META_REASONING_EFFORT")

ev = pd.read_csv("data/kbli_eval.csv", dtype=str)
vecs = load_vectors()
codes = kbli["kode"].tolist()
titles = kbli["judul"].tolist()

# latency of ONE query embedding call (what a real user request costs)
t0 = time.time()
embed([ev["description"].iloc[0]], task_type="RETRIEVAL_QUERY")
EMBED_LATENCY = time.time() - t0

# one API call for all 20 queries (used by the scoring below)
qvecs = embed(ev["description"].tolist(), task_type="RETRIEVAL_QUERY")


def bm25_scores(desc):
    return np.asarray(bm25.get_scores(tokenize(desc)), dtype="float64")


def emb_scores(i):
    return vecs @ qvecs[i]


def rrf(score_lists, k=60):
    fused = np.zeros(len(score_lists[0]))
    for s in score_lists:
        for rank, idx in enumerate(np.argsort(-s)):
            fused[idx] += 1.0 / (k + rank + 1)
    return fused


usage = {"in": 0, "out": 0, "calls": 0, "seconds": 0.0}


def rerank(desc, cand_idx):
    cand_text = "\n".join(f"{codes[j]} | {titles[j]}" for j in cand_idx)
    kwargs = {"extra_body": {"reasoning_effort": EFFORT}} if EFFORT else {}
    t0 = time.time()
    r = llm.chat.completions.create(
        model=os.environ["META_MODEL"],
        messages=[
            {"role": "system", "content": RERANK_PROMPT},
            {"role": "user", "content": f"Deskripsi usaha:\n{desc}\n\nKandidat:\n{cand_text}"},
        ],
        max_tokens=3000,
        temperature=0,
        **kwargs,
    )
    usage["seconds"] += time.time() - t0
    usage["in"] += r.usage.prompt_tokens
    usage["out"] += r.usage.completion_tokens
    usage["calls"] += 1
    text = r.choices[0].message.content or ""
    allowed = {codes[j] for j in cand_idx}
    try:
        picked = json.loads(re.search(r"\{.*\}", text, re.S).group(0))["top3"]
        picked = [c for c in picked if c in allowed]
    except Exception:
        picked = []
    for j in cand_idx:   # fill missing slots from first-stage order
        if len(picked) >= 3:
            break
        if codes[j] not in picked:
            picked.append(codes[j])
    return picked[:3]


def score(name, get_top3):
    t1 = t3 = 0
    misses = []
    spent = 0.0
    for i, row in ev.iterrows():
        t0 = time.time()
        top = get_top3(i, row["description"])
        spent += time.time() - t0
        t1 += top[0] == row["expected_kode"]
        hit = row["expected_kode"] in top
        t3 += hit
        if not hit:
            misses.append((row["description"], row["expected_kode"], top))
    n = len(ev)
    print(f"\n== {name}: Top-1 {t1}/{n} = {t1/n:.0%} | Top-3 {t3}/{n} = {t3/n:.0%} | avg {spent/n*1000:.0f} ms per query (excludes the embedding API call)")
    for d, exp, got in misses:
        print(f"   MISS: {d} | expected {exp} | got {got}")


def top_codes(scores, k=3):
    return [codes[j] for j in np.argsort(-scores)[:k]]


score("BM25 only", lambda i, d: top_codes(bm25_scores(d)))
score("Google embedding only", lambda i, d: top_codes(emb_scores(i)))
score("Hybrid RRF (BM25 + embedding)", lambda i, d: top_codes(rrf([bm25_scores(d), emb_scores(i)])))


def hybrid_rerank(i, d):
    fused = rrf([bm25_scores(d), emb_scores(i)])
    return rerank(d, list(np.argsort(-fused)[:5]))


score("Hybrid + muse-spark re-rank (top-5 candidates)", hybrid_rerank)
def embed_rerank(i, d):
    return rerank(d, list(np.argsort(-emb_scores(i))[:5]))


score("Embedding + muse-spark re-rank (top-5 from embedding only)", embed_rerank)
n = max(usage["calls"], 1)
cost = usage["in"] * PRICE_IN + usage["out"] * PRICE_OUT
print(f"\nGoogle embedding API latency for ONE query: {EMBED_LATENCY*1000:.0f} ms")
print(f"Reasoning effort used: {EFFORT or 'not set'}")
print(f"Re-rank: {usage['calls']} calls, avg latency {usage['seconds']/n:.1f}s, "
      f"avg {usage['in']/n:.0f} in / {usage['out']/n:.0f} out tokens, "
      f"avg cost ${cost/n:.4f} per query, total ${cost:.3f}")