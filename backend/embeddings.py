"""
Embeddings module – wraps sentence-transformers for local embedding generation.
"""

from functools import lru_cache
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from config import EMBEDDING_MODEL

_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def embed_text(text: str) -> np.ndarray:
    """Return the embedding vector for a single string."""
    model = _get_model()
    return model.encode(text, normalize_embeddings=True)


def embed_texts(texts: list[str], batch_size: int = 64) -> np.ndarray:
    """Return an (N, D) ndarray of embeddings for a list of strings."""
    model = _get_model()
    return model.encode(texts, batch_size=batch_size, normalize_embeddings=True)
