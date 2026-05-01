# Similarity Service

This service provides a separate Python layer for session similarity search using:

- `sentence-transformers` for embeddings
- `faiss` for nearest-neighbor search
- on-disk persistence for stored embeddings and the FAISS index

## Endpoints

- `GET /health`
- `POST /sessions/upsert`
- `POST /sessions/search`

## Run

```bash
cd similarity_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Environment

- `SIMILARITY_EMBEDDING_MODEL`
  default: `sentence-transformers/all-MiniLM-L6-v2`

- `SIMILARITY_DATA_DIR`
  default: `./data`

## Backend Integration

The Node backend expects this service at:

- `SIMILARITY_SERVICE_URL=http://localhost:8000`

Report generation upserts the current session embedding, searches top 3 similar sessions, then caches those hydrated Mongo results back onto the session document.
