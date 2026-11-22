import re
import pandas as pd
from rank_bm25 import BM25Okapi


def tokenize(text):
    return re.findall(r"[a-z0-9]+", str(text).lower())


kbli = pd.read_csv("data/kbli_2025.csv", dtype=str).fillna("")
docs = (kbli["judul"] + " " + kbli["deskripsi"]).tolist()
bm25 = BM25Okapi([tokenize(d) for d in docs])


def top_k(description, k=3):
    scores = bm25.get_scores(tokenize(description))
    idx = scores.argsort()[::-1][:k]
    return [
        {"kode": kbli.loc[i, "kode"], "judul": kbli.loc[i, "judul"], "score": float(scores[i])}
        for i in idx
    ]


if __name__ == "__main__":
    ev = pd.read_csv("data/kbli_eval.csv", dtype=str)
    top1 = top3 = 0
    for _, row in ev.iterrows():
        codes = [r["kode"] for r in top_k(row["description"])]
        top1 += codes[0] == row["expected_kode"]
        hit = row["expected_kode"] in codes
        top3 += hit
        if not hit:
            print("MISS:", row["description"], "| expected", row["expected_kode"], "| got", codes)
    n = len(ev)
    print(f"Top-1: {top1}/{n} = {top1/n:.0%}")
    print(f"Top-3: {top3}/{n} = {top3/n:.0%}")