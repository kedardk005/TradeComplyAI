import os
import json
import sys
from groq import Groq
from app.embeddings import embed_text
from app.vectorstore import query_hs_codes

def generate_readiness_rules(description: str, category: str | None = None) -> dict:
    """
    Identifies import regulations and requirements using HTS candidates and Groq LLM reasoning.
    Returns:
      dict: { "rules": [ { "requirement": str, "description": str, "source": str } ] }
    """
    api_key = os.environ.get("GROQ_API_KEY", "")
    client = Groq(api_key=api_key) if (api_key and api_key != "test_groq_api_key_dev") else None

    # Step 1: Retrieve context candidates from semantic index
    try:
        query_embedding = embed_text(description)
        candidates = query_hs_codes(query_embedding, top_k=5)
    except Exception as e:
        print(f"Error querying candidates in readiness: {e}", file=sys.stderr)
        candidates = []

    # Build prompt
    prompt = f"Product Description: {description}\n"
    if category:
        prompt += f"Product Category: {category}\n"
    
    if candidates:
        prompt += "\nRelevant candidate HTS codes retrieved from reference database for context:\n"
        for c in candidates:
            prompt += f"- HTS Code: {c['hs_code']} | Description: {c['document']}\n"

    system_prompt = (
        "You are an international trade compliance consultant specializing in import regulations for the India-US corridor.\n"
        "Analyze the product details and candidate tariff codes, and output the required import regulations, clearances, "
        "or agency permits required by U.S. government agencies (e.g., CBP, FDA, USDA, EPA, FWS).\n\n"
        "You MUST return your output in JSON format matching this schema:\n"
        "{\n"
        "  \"rules\": [\n"
        "    {\n"
        "      \"requirement\": \"Short, descriptive requirement title (e.g. FDA Prior Notice Filing)\",\n"
        "      \"description\": \"Detailed explanation of what compliance steps are necessary.\",\n"
        "      \"source\": \"Specific citation of the regulation, law, or agency (e.g., FDA 21 CFR § 1.285)\"\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Guidelines:\n"
        "1. Identify 2-4 primary requirements.\n"
        "2. If you are not fully confident in a rule's currency or accuracy, you must append ' | NEEDS MANUAL VERIFICATION: verify current agency rules' to the description field, and start the source field with 'NEEDS MANUAL VERIFICATION:'.\n"
        "3. Do not include formatting wrappers or markdown code blocks around the JSON; output raw JSON only."
    )

    # Fallback response if Groq API is not configured or in sandbox testing environment
    if not client:
        print("Groq API key not configured or using test key. Returning static AI-assisted fallback rules.", file=sys.stderr)
        return {
            "rules": [
                {
                    "requirement": "General Customs Entry Summary (CBP Form 7501)",
                    "description": "Standard import entry documentation filed via ACE portal within 15 calendar days of shipment arrival. | NEEDS MANUAL VERIFICATION: verify standard entry documentation",
                    "source": "NEEDS MANUAL VERIFICATION: 19 CFR Part 142"
                },
                {
                    "requirement": "Partner Government Agency (PGA) Review",
                    "description": "Products in this category may require clearances from PGAs based on active HTS flags. | NEEDS MANUAL VERIFICATION: check HTS flags for specific partner agencies",
                    "source": "NEEDS MANUAL VERIFICATION: CBP PGA Integration Guidelines"
                }
            ]
        }

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        response_content = completion.choices[0].message.content
        return json.loads(response_content)
    except Exception as e:
        print(f"Groq API call or JSON parsing failed in readiness check: {e}", file=sys.stderr)
        return {
            "rules": [
                {
                    "requirement": "Import Customs Clearance (CBP Form 7501)",
                    "description": "A formal Entry Summary must be filed with CBP. | NEEDS MANUAL VERIFICATION: verify standard entry documentation",
                    "source": "NEEDS MANUAL VERIFICATION: 19 CFR Part 142"
                }
            ]
        }
