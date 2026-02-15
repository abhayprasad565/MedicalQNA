"""
RAG Engine – vector store management + retrieval-augmented generation pipeline.

Uses FAISS for fast in-memory similarity search.
"""

from typing import Optional
import numpy as np

try:
    import faiss
except ImportError:
    faiss = None  # type: ignore

from config import RAG_TOP_K
import embeddings as emb
import context_loader


# ── In-memory store ─────────────────────────────────────────────────────────

class VectorStore:
    """Lightweight FAISS-backed vector store."""

    def __init__(self, dimension: int = 384):
        if faiss is None:
            raise ImportError(
                "faiss-cpu is required. Install with: pip install faiss-cpu"
            )
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)  # inner-product (cosine after L2-norm)
        self.texts: list[str] = []

    @property
    def size(self) -> int:
        return self.index.ntotal

    def add(self, chunks: list[str]) -> int:
        """Embed and add chunks. Returns number of vectors added."""
        if not chunks:
            return 0
        vectors = emb.embed_texts(chunks).astype("float32")
        faiss.normalize_L2(vectors)
        self.index.add(vectors)
        self.texts.extend(chunks)
        return len(chunks)

    def search(self, query: str, top_k: int = RAG_TOP_K) -> list[dict]:
        """
        Return the top-k most relevant chunks for *query*.
        Each result: {"text": str, "score": float}
        """
        if self.index.ntotal == 0:
            return []
        vec = emb.embed_text(query).astype("float32").reshape(1, -1)
        faiss.normalize_L2(vec)
        scores, indices = self.index.search(vec, min(top_k, self.index.ntotal))
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            results.append({"text": self.texts[idx], "score": float(score)})
        return results

    def clear(self) -> None:
        """Drop all stored vectors."""
        self.index.reset()
        self.texts.clear()


# ── Singleton store (per-process) ───────────────────────────────────────────

_store: Optional[VectorStore] = None


def get_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
    return _store


# ── Pipeline helpers ────────────────────────────────────────────────────────

def ingest_content(content: str, fmt: Optional[str] = None) -> int:
    """Parse, chunk, embed, and store history content. Returns chunk count."""
    chunks = context_loader.load_and_chunk(content, fmt=fmt)
    return get_store().add(chunks)


def retrieve_context(query: str, top_k: int = RAG_TOP_K) -> str:
    """Retrieve relevant chunks and return a combined context string."""
    results = get_store().search(query, top_k=top_k)
    if not results:
        return ""
    pieces = [f"[Relevance {r['score']:.2f}] {r['text']}" for r in results]
    return "\n\n".join(pieces)
