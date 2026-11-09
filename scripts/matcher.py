import numpy as np
import pandas as pd

VEC_PATH = "data/kbli_vectors.npy"


def embed(texts):
    """Return a numpy array of shape (len(texts), dim).
    This is the ONLY function that changes when the embedding source is decided."""
    raise NotImplementedError("Embedding source not decided yet (see ticket)")


def build_text(row):
    return f"{row['judul']} {row['deskripsi']}".strip()


def load_codebook():
    kbli = pd.read_csv("data/kbli_2025.csv", dtype=str).fillna("")
    texts = [build_text(r) for _, r in kbli.iterrows()]
    return kbli, texts


def build_index():
    kbli, texts = load_codebook()
    vectors = np.asarray(embed(texts), dtype="float32")
    np.save(VEC_PATH, vectors)
    print("Saved", VEC_PATH, "shape:", vectors.shape)  # shape[1] = dimension


def load_vectors():
    return np.load(VEC_PATH)


def top3(description, kbli, vectors):
    q = np.asarray(embed([description])[0], dtype="float32")
    sims = vectors @ q / (np.linalg.norm(vectors, axis=1) * np.linalg.norm(q))
    idx = sims.argsort()[::-1][:3]
    return [
        {"kode": kbli.loc[i, "kode"], "judul": kbli.loc[i, "judul"], "score": round(float(sims[i]), 2)}
        for i in idx
    ]


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "build":
        build_index()
    else:
        kbli, _ = load_codebook()
        vecs = load_vectors()
        tests = [
            "Saya jual kopi dan roti buatan sendiri di warung kecil, omzet sekitar 15 juta per bulan.",
            # add at least 4 more test inputs here
        ]
        for t in tests:
            print(t)
            for r in top3(t, kbli, vecs):
                print("  ", r)