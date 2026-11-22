"""Check pgvector cosine retrieval returns relevant chunks with citations.

Run from the backend folder:
    cd G:\\Legalyst\\backend
    python scripts\\verify_retrieval.py
"""
from ingest_regulations import Obligation, RegulationChunk, Session, embed, get_engine, select

QUESTIONS = [
    "Apa saja syarat izin usaha untuk warung makan mikro?",
    "Apakah katering rumahan wajib punya SLHS?",
    "Kapan saya harus lapor LKPM?",
    "Apa izin untuk jualan baju online di marketplace?",
]


def main():
    engine = get_engine()
    vectors = embed(QUESTIONS, task_type="RETRIEVAL_QUERY")
    with Session(engine) as session:
        for question, qvec in zip(QUESTIONS, vectors):
            distance = RegulationChunk.embedding.cosine_distance(qvec).label("distance")
            stmt = (
                select(
                    RegulationChunk.source,
                    RegulationChunk.content,
                    Obligation.source_article,
                    Obligation.source_url,
                    distance,
                )
                .join(Obligation, Obligation.obligation_id == RegulationChunk.source)
                .order_by(distance)
                .limit(3)
            )
            print(f"\nQ: {question}")
            for rank, row in enumerate(session.execute(stmt), start=1):
                print(f"  {rank}. {row.source}  distance={row.distance:.3f}")
                print(f"     {row.content.splitlines()[4][:110]}...")
                print(f"     Pasal : {row.source_article}")
                print(f"     URL   : {row.source_url}")


if __name__ == "__main__":
    main()