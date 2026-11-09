import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(base_url=os.environ["META_BASE_URL"], api_key=os.environ["META_API_KEY"])

descs = [
    "Saya jual kopi dan roti buatan sendiri di warung kecil, omzet sekitar 15 juta per bulan.",
    "Saya buka warung makan nasi padang di pinggir jalan.",
    "Jualan baju lewat Instagram dan Shopee, barang dari supplier Tanah Abang.",
    "Katering nasi kotak untuk kantor dan acara arisan.",
    "Minimarket kecil jual sembako dan jajanan di depan rumah.",
]

for model in ["muse-spark-1.3", "muse-wonder-1.0"]:
    print("=" * 30, model)
    for d in descs:
        r = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": f"Ringkas jenis usaha ini dalam satu kalimat: {d}"}],
            max_tokens=3000,
        )
        c = r.choices[0]
        print(d)
        print("->", c.message.content)
        print("finish_reason:", c.finish_reason, "| tokens in/out:", r.usage.prompt_tokens, r.usage.completion_tokens)
        print("-" * 30)