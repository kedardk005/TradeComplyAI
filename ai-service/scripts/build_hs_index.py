import os
import sys
import psycopg2
from dotenv import load_dotenv

# Add the parent directory of this script to the Python path to allow app imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.embeddings import embed_text
from app.vectorstore import add_hs_codes

load_dotenv()

def build_index():
  database_url = os.environ.get("DATABASE_URL")
  if not database_url:
    print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr, flush=True)
    sys.exit(1)

  print("Connecting to PostgreSQL database...", flush=True)
  try:
    conn = psycopg2.connect(dsn=database_url)
    cursor = conn.cursor()
  except Exception as e:
    print(f"ERROR: Failed to connect to database: {e}", file=sys.stderr, flush=True)
    sys.exit(1)

  print("Fetching HS Code references...", flush=True)
  try:
    # Fetch all records
    cursor.execute('SELECT hs_code, description, chapter, section, notes FROM "HSCodeReference"')
    rows = cursor.fetchall()
    total_records = len(rows)
    print(f"Found {total_records} reference records in PostgreSQL.", flush=True)
  except Exception as e:
    print(f"ERROR: Failed to retrieve data from HSCodeReference: {e}", file=sys.stderr, flush=True)
    conn.close()
    sys.exit(1)

  if total_records == 0:
    print("WARNING: No HS Code references found in PostgreSQL. Please run the database loader first.", flush=True)
    cursor.close()
    conn.close()
    sys.exit(0)

  print("Indexing records into Chroma database (this will take a few minutes)...", flush=True)
  
  # Accumulation batches
  batch_size = 500
  ids = []
  embeddings = []
  documents = []
  metadatas = []
  
  processed_count = 0

  for row in rows:
    hs_code, description, chapter, section, notes = row
    
    # Clean inputs
    hs_code = hs_code.strip()
    description = description.strip() if description else ""
    chapter = chapter.strip() if chapter else ""
    section = section.strip() if section else ""
    notes = notes.strip() if notes else ""
    
    # 1. Structure the semantic search document text
    # RATIONALE: Concatenating code, category path hierarchy (description), and notes ensures that
    # the vector embedding model has the full semantic context when scoring a product search.
    notes_part = f" | Notes: {notes}" if notes else ""
    doc_text = f"HS Code: {hs_code} | Section: {section} | Chapter: {chapter} | Description: {description}{notes_part}"
    
    # 2. Extract embedding vector
    embedding = embed_text(doc_text)
    
    # 3. Queue metadata
    ids.append(hs_code)
    embeddings.append(embedding)
    documents.append(doc_text)
    metadatas.append({
        "hs_code": hs_code,
        "chapter": chapter,
        "section": section
    })
    
    processed_count += 1

    # Write batch if size threshold reached
    if len(ids) >= batch_size:
      add_hs_codes(ids, embeddings, documents, metadatas)
      ids = []
      embeddings = []
      documents = []
      metadatas = []
      print(f"Indexed {processed_count}/{total_records} vectors...", flush=True)

  # Write remaining
  if ids:
    add_hs_codes(ids, embeddings, documents, metadatas)
    print(f"Indexed {processed_count}/{total_records} vectors...", flush=True)

  print("\n--- VECTOR INDEXING COMPLETED ---", flush=True)
  print(f"Total Vectors Indexed: {processed_count}", flush=True)

  cursor.close()
  conn.close()

if __name__ == "__main__":
  build_index()
