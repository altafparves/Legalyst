import os
from dotenv import load_dotenv

load_dotenv()

for name in ["META_API_KEY", "META_BASE_URL", "META_MODEL", "META_EMBED_MODEL"]:
    value = os.environ.get(name)
    if not value:
        print(f"{name}: EMPTY")
    elif name == "META_API_KEY":
        print(f"{name}: set ({len(value)} characters)")
    else:
        print(f"{name}: {value}")