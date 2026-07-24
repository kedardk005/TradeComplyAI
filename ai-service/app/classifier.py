import os
import json
import sys
from groq import Groq
from app.embeddings import embed_text
from app.vectorstore import query_hs_codes

def classify_product(description: str, category: str | None = None) -> dict:
  """
  Classifies a product description into its corresponding HS Code using a hybrid search-LLM pipeline:
  1. Semantic search fetches candidate HS codes.
  2. Groq LLM selects the best candidate and outputs structured JSON (hs_code, confidence, reasoning).
  3. Fails gracefully with low-confidence fallback if API errors or validation errors occur.
  """
  api_key = os.environ.get("GROQ_API_KEY", "")
  client = Groq(api_key=api_key) if (api_key and api_key != "test_groq_api_key_dev") else None
  # Step 1: Retrieve top candidates from semantic search
  try:
    query_embedding = embed_text(description)
    # Retrieve top 6 candidates to provide a rich context window for the LLM
    candidates = query_hs_codes(query_embedding, top_k=6)
  except Exception as e:
    print(f"Error querying candidates: {e}", file=sys.stderr)
    candidates = []

  if not candidates:
    return {
      "hs_code": "UNKNOWN",
      "confidence": 0,
      "reasoning": "Could not retrieve any candidate HS codes from the vector database.",
      "needs_review": True,
      "candidates": []
    }

  # Build LLM Prompt
  prompt = f"Product Description: {description}\n"
  if category:
    prompt += f"Category Category: {category}\n"
  prompt += "\nHere is the candidate HTS codes list retrieved from the reference database:\n"
  
  for idx, c in enumerate(candidates):
    prompt += f"\nCandidate {idx + 1}:\n"
    prompt += f"  HTS Code: {c['hs_code']}\n"
    prompt += f"  Description: {c['document']}\n"
    prompt += f"  Semantic Score: {c['score']:.4f}\n"

  prompt += """
Your task is to select the single best HTS Code for this product from the candidates listed above.
You must return your choice as a JSON object matching this schema:
{
  "hs_code": "The selected HTS code string (MUST match one of the candidate codes exactly)",
  "confidence": 0 to 100 integer representing your classification confidence,
  "reasoning": "A brief explanation of why this code matches the product"
}
"""

  if not client or api_key == "test_groq_api_key_dev" or not api_key:
    # Handle missing or placeholder API keys gracefully
    top = candidates[0]
    return {
      "hs_code": top["hs_code"],
      "confidence": 50,
      "reasoning": "Groq API client is not configured or using a placeholder key. Fell back to top semantic match.",
      "needs_review": True,
      "candidates": candidates
    }

  # Call LLM with retry loop (defensive parsing)
  max_attempts = 2
  for attempt in range(max_attempts):
    try:
      completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        messages=[
          {
            "role": "system",
            "content": "You are an expert trade compliance officer. Choose the best HTS code and return ONLY a JSON object."
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
        temperature=0.1 # low temperature for high determinism
      )
      
      content = completion.choices[0].message.content
      data = json.loads(content)
      
      # Validate response schema keys
      hs_code = str(data.get("hs_code", "")).strip()
      confidence = int(data.get("confidence", 50))
      reasoning = str(data.get("reasoning", "")).strip()
      
      if not hs_code:
        raise ValueError("Missing 'hs_code' key in response JSON")
        
      return {
        "hs_code": hs_code,
        "confidence": confidence,
        "reasoning": reasoning,
        "needs_review": confidence < 70,
        "candidates": candidates
      }
    except Exception as e:
      print(f"Attempt {attempt + 1} failed for classify_product: {e}", file=sys.stderr)
      if attempt == max_attempts - 1:
        # Final attempt failed - fall back gracefully
        top = candidates[0]
        return {
          "hs_code": top["hs_code"],
          "confidence": 50,
          "reasoning": f"LLM classification failed due to parsing/API error: {e}. Fell back to top database match.",
          "needs_review": True,
          "candidates": candidates
        }
