import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.embeddings import embed_text
from app.vectorstore import query_hs_codes

# Load environment variables
load_dotenv()

app = FastAPI(
    title="TradeComplyAI AI Service API",
    description="Python microservice for LLM classification and agents",
    version="1.0.0"
)

# Enable CORS for local cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/debug/search-hs")
def debug_search_hs(q: str, k: int = 5):
    """
    TEMPORARY DEBUG ENDPOINT (TO BE REMOVED IN SESSIONS 6+)
    Allows testing search retrieval quality and similarity scoring against Chroma.
    """
    if not q or not q.strip():
        return {"error": "Query string 'q' is required"}
    try:
        query_embedding = embed_text(q)
        matches = query_hs_codes(query_embedding, top_k=k)
        return {
            "query": q,
            "results": matches
        }
    except Exception as e:
        return {"error": str(e)}
