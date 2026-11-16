import os

import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(base_url=os.environ["META_BASE_URL"], api_key=os.environ["META_API_KEY"])
PROMPT = open("prompts/kbli_rerank.md", encoding="utf-8").read()

kbli = pd.read_csv("data/kbli_2025.csv", dtype=str).fillna("")
titles = dict(zip(kbli["kode"], kbli["judul"]))
cands = ["56304", "56303", "56306", "56102", "56101"]
cand_text = "\n".join(f"{c} | {titles[c]}" for c in cands)
desc = "Usaha kedai kopi susu dan es jus, tempatnya pakai tenda yang bisa dibongkar pasang."

for effort in [None, "minimal", "low", "medium"]:   # None = default (high)
    kwargs = {"extra_body": {"reasoning_effort": effort}} if effort else {}
    try:
        r = client.chat.completions.create(
            model=os.environ["META_MODEL"],
            messages=[
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": f"Deskripsi usaha:\n{desc}\n\nKandidat:\n{cand_text}"},
            ],
            max_tokens=3000,
            temperature=0,
            **kwargs,
        )
        details = getattr(r.usage, "completion_tokens_details", None)
        reasoning = getattr(details, "reasoning_tokens", None)
        print("effort =", effort or "default (high)")
        print("  answer:", r.choices[0].message.content)
        print("  finish_reason:", r.choices[0].finish_reason)
        print("  tokens in/out:", r.usage.prompt_tokens, r.usage.completion_tokens,
              "| reasoning tokens:", reasoning)
    except Exception as e:
        print("effort =", effort, "-> ERROR:", e)
    print("-" * 40)