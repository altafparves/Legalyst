from fastapi import FastAPI

app = FastAPI(title="Legalyst API")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"status": "ok"}
