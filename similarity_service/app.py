from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

import faiss
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer


EMBEDDING_MODEL_NAME = os.getenv(
    "SIMILARITY_EMBEDDING_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2",
)
DATA_DIR = Path(os.getenv("SIMILARITY_DATA_DIR", Path(__file__).resolve().parent / "data"))
STORE_PATH = DATA_DIR / "embedding_store.json"
INDEX_PATH = DATA_DIR / "session_index.faiss"


class UpsertSessionRequest(BaseModel):
    session_id: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchSessionRequest(BaseModel):
    session_id: str | None = None
    text: str
    top_k: int = 3


class EmbeddingStore:
    def __init__(self, model_name: str, store_path: Path, index_path: Path) -> None:
        self.model_name = model_name
        self.store_path = store_path
        self.index_path = index_path
        self.lock = threading.Lock()
        self.model = SentenceTransformer(model_name)
        self.dimension = int(self.model.get_sentence_embedding_dimension())
        self.records: dict[str, dict[str, Any]] = {}
        self.index = faiss.IndexFlatIP(self.dimension)
        self.row_to_session_id: list[str] = []
        self._load()

    def _embed(self, texts: list[str]) -> np.ndarray:
        vectors = self.model.encode(
            texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return np.asarray(vectors, dtype="float32")

    def _load(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if self.store_path.exists():
            with self.store_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
                self.records = payload.get("records", {})

        if self.records:
            self._rebuild_index()
        else:
            self.index = faiss.IndexFlatIP(self.dimension)
            self.row_to_session_id = []

    def _persist(self) -> None:
        payload = {
            "embedding_model": self.model_name,
            "records": self.records,
        }
        with self.store_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle)

        faiss.write_index(self.index, str(self.index_path))

    def _rebuild_index(self) -> None:
        self.index = faiss.IndexFlatIP(self.dimension)
        self.row_to_session_id = list(self.records.keys())

        if not self.row_to_session_id:
            return

        vectors = np.asarray(
            [self.records[session_id]["embedding"] for session_id in self.row_to_session_id],
            dtype="float32",
        )
        self.index.add(vectors)

    def upsert(self, session_id: str, text: str, metadata: dict[str, Any]) -> dict[str, Any]:
        cleaned_text = text.strip()
        if not cleaned_text:
            return {
                "session_id": session_id,
                "indexed_count": len(self.records),
                "embedding_model": self.model_name,
            }

        embedding = self._embed([cleaned_text])[0]

        with self.lock:
            self.records[session_id] = {
                "text": cleaned_text,
                "metadata": metadata,
                "embedding": embedding.tolist(),
            }
            self._rebuild_index()
            self._persist()

        return {
            "session_id": session_id,
            "indexed_count": len(self.records),
            "embedding_model": self.model_name,
        }

    def search(self, session_id: str | None, text: str, top_k: int) -> list[dict[str, Any]]:
        cleaned_text = text.strip()
        if not cleaned_text or self.index.ntotal == 0:
            return []

        query_vector = self._embed([cleaned_text])
        search_k = min(max(top_k + 1, top_k), self.index.ntotal)
        scores, indices = self.index.search(query_vector, search_k)

        matches: list[dict[str, Any]] = []
        for score, row_index in zip(scores[0], indices[0]):
            if row_index < 0:
                continue

            matched_session_id = self.row_to_session_id[row_index]
            if session_id and matched_session_id == session_id:
                continue

            matches.append(
                {
                    "session_id": matched_session_id,
                    "score": float(score),
                }
            )

            if len(matches) >= top_k:
                break

        return matches


store = EmbeddingStore(
    model_name=EMBEDDING_MODEL_NAME,
    store_path=STORE_PATH,
    index_path=INDEX_PATH,
)

app = FastAPI(title="Similarity Service")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "embedding_model": store.model_name,
        "indexed_count": len(store.records),
    }


@app.post("/sessions/upsert")
def upsert_session(request: UpsertSessionRequest) -> dict[str, Any]:
    return store.upsert(request.session_id, request.text, request.metadata)


@app.post("/sessions/search")
def search_sessions(request: SearchSessionRequest) -> dict[str, Any]:
    return {
        "matches": store.search(request.session_id, request.text, request.top_k),
    }
