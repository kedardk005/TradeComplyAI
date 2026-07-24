import os
from sentence_transformers import SentenceTransformer

# Load the sentence transformer model once at the module level.
# RATIONALE: Loading a PyTorch model from disk takes 2-5 seconds because it reads configuration,
# compiles model layers, and reads weights into memory. Loading it once at module startup caches the 
# model in RAM, enabling future requests to generate embeddings in milliseconds instead of seconds.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)

def embed_text(text: str) -> list[float]:
  """
  Generates a list of floats representing the embedding vector for the input text.
  Returns a 384-dimensional vector.
  """
  if not text or not text.strip():
    # Return zero vector if text is empty
    return [0.0] * 384
    
  embedding = model.encode(text, convert_to_numpy=True)
  return embedding.tolist()
