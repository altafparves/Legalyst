import os
import time

import numpy as np
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

VEC_PATH = "data/kbli_vectors.npy"
_client = None


def _get_client():
    global _client
    if _client is None:
        from google import genai

        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def embed(texts, task_type="RETRIEVAL_DOCUMENT", batch_size=20, pause=6.0, max_retries=6):
    """Return an (n, dim) float32 array, L2-normalized.
    Sends batch_size texts per API call, waits `pause` seconds between calls,
    and retries with exponential backoff on rate-limit errors."""
    from google.genai import types

    client = _get_client()
    model = os.environ["GEMINI_EMBED_MODEL"]
    dim = int(os.environ["GEMINI_EMBED_DIM"])
    texts = list(texts)
    out = []
    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        delay = 2.0
        for attempt in range(max_retries):
            try:
                res = client.models.embed_content(
                    model=model,
                    contents=batch,
                    config=types.EmbedContentConfig(
                        task_type=task_type, output_dimensionality=dim
                    ),
                )
                out.extend(e.values for e in res.embeddings)
                break
            except Exception as e:
                msg = str(e)
                limited = "429" in msg or "RESOURCE_EXHAUSTED" in msg
                if limited and attempt < max_retries - 1:
                    time.sleep(delay)
                    delay = min(delay * 2, 60)
                    continue
                raise
        if start + batch_size < len(texts):
            time.sleep(pause)
    vecs = np.asarray(out, dtype="float32")
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    return vecs / np.maximum(norms, 1e-12)


def build_text(row):
    return f"{row['judul']} {row['deskripsi']}".strip()


def load_codebook():
    kbli = pd.read_csv("data/kbli_2025.csv", dtype=str).fillna("")
    texts = [build_text(r) for _, r in kbli.iterrows()]
    return kbli, texts


def build_index():
    kbli, texts = load_codebook()
    vectors = embed(texts, task_type="RETRIEVAL_DOCUMENT")
    np.save(VEC_PATH, vectors)
    print("Saved", VEC_PATH, "shape:", vectors.shape)


def load_vectors():
    return np.load(VEC_PATH)


def top3(description, kbli, vectors, query_vec=None):
    q = query_vec if query_vec is not None else embed([description], task_type="RETRIEVAL_QUERY")[0]
    sims = vectors @ q / (np.linalg.norm(vectors, axis=1) * np.linalg.norm(q))
    idx = sims.argsort()[::-1][:3]
    return [
        {"kode": kbli.loc[i, "kode"], "judul": kbli.loc[i, "judul"], "score": round(float(sims[i]), 2)}
        for i in idx
    ]


MANUAL_TESTS = [
    "Saya jual kopi dan roti buatan sendiri di warung kecil, omzet sekitar 15 juta per bulan.",
    "Saya jualan pecel lele di warung tenda pinggir jalan setiap malam.",
    "Buka toko skincare dan make up, produk dari brand lokal.",
    "Jualan baju lewat Instagram dan Shopee, barang dari supplier Tanah Abang.",
    "Warung kelontong di depan rumah jual sembako, rokok, dan minuman.",
    "Terima katering nasi kotak untuk acara kantor dan arisan.",
]

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "build":
        build_index()
    else:
        kbli, _ = load_codebook()
        vecs = load_vectors()
        for t in MANUAL_TESTS:
            print(t)
            for r in top3(t, kbli, vecs):
                print("  ", r)
            print()