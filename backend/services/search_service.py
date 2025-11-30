import json
import numpy as np
from models.resume import Resume

async def get_embedding(text: str):
    return []

async def upsert_embedding_for_resume(resume_id: int, db):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        return
    # Stubbed embedding
    resume.embedding = json.dumps([])
    db.add(resume); db.commit(); db.refresh(resume)

async def semantic_search_candidates(text: str, db):
    # Get embedding for query
    qemb = await get_embedding(text)
    if not qemb:
        # fallback simple keyword search
        resumes = db.query(Resume).filter(Resume.content.ilike(f"%{text}%")).all()
        return [{'resume_id': r.id, 'snippet': (r.content or '')[:200]} for r in resumes]
    q = np.array(qemb)
    results = []
    resumes = db.query(Resume).all()
    for r in resumes:
        if not r.embedding:
            continue
        emb = np.array(json.loads(r.embedding))
        # cosine similarity
        sim = float(np.dot(q, emb) / (np.linalg.norm(q) * np.linalg.norm(emb) + 1e-8))
        results.append({'resume_id': r.id, 'similarity': sim, 'snippet': (r.content or '')[:200]})
    results.sort(key=lambda x: x['similarity'], reverse=True)
    return results[:20]
