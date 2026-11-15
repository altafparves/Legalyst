import os
import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
model = os.environ["GEMINI_EMBED_MODEL"]
text = "warung makan pecel lele di pinggir jalan"


def get(dim):
    res = client.models.embed_content(
        model=model,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY", output_dimensionality=dim
        ),
    )
    return np.asarray(res.embeddings[0].values, dtype="float32")


full = get(3072)
cut = get(1536)
print("3072 dims, length of vector:", np.linalg.norm(full))
print("1536 dims, length of vector:", np.linalg.norm(cut))
cut_n = cut / np.linalg.norm(cut)
print("1536 dims after L2 normalization:", np.linalg.norm(cut_n))