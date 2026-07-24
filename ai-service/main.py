import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from pydantic import BaseModel

from app.embeddings import embed_text
from app.vectorstore import query_hs_codes
from app.classifier import classify_product
from app.readiness import generate_readiness_rules

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

class ClassifyRequest(BaseModel):
    description: str
    category: str | None = None

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/classify")
def classify(req: ClassifyRequest):
    """
    Classifies a product description and optional category, returning the best HS Code,
    confidence score, reasoning, review flag, and alternative search candidates.
    """
    if not req.description or not req.description.strip():
        raise HTTPException(status_code=400, detail="Product description is required")
    try:
        result = classify_product(req.description, req.category)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ReadinessRequest(BaseModel):
    description: str
    category: str | None = None

@app.post("/readiness-check")
def readiness_check(req: ReadinessRequest):
    """
    Retrieves and reasons about export regulatory readiness requirements for a product description.
    """
    if not req.description or not req.description.strip():
        raise HTTPException(status_code=400, detail="Product description is required")
    try:
        result = generate_readiness_rules(req.description, req.category)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debug/search-hs")
def debug_search_hs(q: str, k: int = 5):
    """
    TEMPORARY DEBUG ENDPOINT (GATED)
    Gated behind DEBUG_ENDPOINTS_ENABLED env flag.
    Allows testing search retrieval quality and similarity scoring against Chroma.
    """
    debug_enabled = os.environ.get("DEBUG_ENDPOINTS_ENABLED", "false").lower() == "true"
    if not debug_enabled:
        raise HTTPException(status_code=403, detail="Debug endpoints are disabled in this environment.")

    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query string 'q' is required")
    try:
        query_embedding = embed_text(q)
        matches = query_hs_codes(query_embedding, top_k=k)
        return {
            "query": q,
            "results": matches
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
