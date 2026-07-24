import os
import chromadb

# Persistent Chroma storage directory
CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")

# Initialize persistent Chroma client
client = chromadb.PersistentClient(path=CHROMA_DIR)

# Get or create the "hs_codes" collection, configured for cosine similarity
collection = client.get_or_create_collection(
    name="hs_codes",
    metadata={"hnsw:space": "cosine"}
)

def add_hs_codes(ids: list[str], embeddings: list[list[float]], documents: list[str], metadatas: list[dict]):
    """
    Upserts a batch of HS codes reference records into the persistent Chroma collection.
    """
    if not ids:
        return
        
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )

def query_hs_codes(query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """
    Queries Chroma for the top_k closest HS Codes using a precomputed embedding vector.
    Converts cosine distance back to a standard cosine similarity score.
    """
    if not query_embedding:
        return []

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )
    
    matches = []
    if not results or not results["ids"] or len(results["ids"][0]) == 0:
        return matches
        
    ids = results["ids"][0]
    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]
    
    for i in range(len(ids)):
        # Cosine distance = 1.0 - cosine_similarity
        # So Cosine similarity = 1.0 - Cosine distance
        similarity = 1.0 - distances[i]
        
        matches.append({
            "hs_code": ids[i],
            "document": documents[i],
            "metadata": metadatas[i],
            "score": round(float(similarity), 4)
        })
        
    return matches
