"""
Medical Safety Engine – detects high-risk / emergency symptoms.

Two layers:
1. Keyword-based pattern matching (fast, always-on)
2. Embedding similarity against a curated emergency-phrase list (optional, higher quality)
"""

import re
from typing import Optional

from config import EMERGENCY_SIMILARITY_THRESHOLD

# ── High-risk keyword patterns ──────────────────────────────────────────────
_EMERGENCY_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"chest\s+pain",
        r"shortness\s+of\s+breath",
        r"difficulty\s+breathing",
        r"can'?t\s+breathe",
        r"severe\s+abdominal\s+pain",
        r"stroke",
        r"face\s+droop",
        r"arm\s+weakness",
        r"slurred?\s+speech",
        r"suicid(e|al)",
        r"self[- ]?harm",
        r"kill\s+(my|him|her|them)?self",
        r"want\s+to\s+die",
        r"severe\s+allergic\s+react",
        r"anaphyla",
        r"throat\s+(is\s+)?swell",
        r"loss\s+of\s+consciousness",
        r"passed?\s+out",
        r"faint(ed|ing)",
        r"unresponsive",
        r"fever.{0,20}(10[3-9]|1[1-9]\d)\s*[°fF]",
        r"high\s+fever",
        r"persistent\s+fever",
        r"uncontrolled\s+bleed",
        r"won'?t\s+stop\s+bleed",
        r"heavy\s+bleed",
        r"coughing\s+(up\s+)?blood",
        r"vomiting\s+blood",
        r"seizure",
        r"convulsion",
        r"overdos",
        r"poison",
    ]
]

_EMERGENCY_PHRASES: list[str] = [
    "I am having chest pain",
    "I can't breathe",
    "shortness of breath",
    "severe abdominal pain",
    "I think I'm having a stroke",
    "I want to kill myself",
    "suicidal thoughts",
    "I want to die",
    "severe allergic reaction",
    "my throat is swelling shut",
    "I lost consciousness",
    "I fainted and can't get up",
    "fever over 103",
    "uncontrolled bleeding",
    "bleeding won't stop",
    "I overdosed on pills",
    "someone poisoned me",
    "I'm having a seizure",
]

_EMERGENCY_MESSAGE = (
    "🚨 This may indicate a medical emergency. "
    "Please seek immediate medical care or call your local emergency number."
)


# ── Public API ───────────────────────────────────────────────────────────────

def check_keywords(text: str) -> bool:
    """Return True if any keyword pattern matches."""
    for pattern in _EMERGENCY_PATTERNS:
        if pattern.search(text):
            return True
    return False


def check_embedding_similarity(
    text: str,
    embed_fn: Optional[object] = None,
) -> tuple[bool, float]:
    """
    Compare *text* against curated emergency phrases via cosine similarity.
    Returns (is_emergency, max_score).

    If no embedding function is supplied, returns (False, 0.0).
    """
    if embed_fn is None:
        return False, 0.0

    try:
        import numpy as np

        query_vec = embed_fn(text)
        phrase_vecs = [embed_fn(p) for p in _EMERGENCY_PHRASES]

        scores = []
        for pvec in phrase_vecs:
            cos_sim = float(
                np.dot(query_vec, pvec)
                / (np.linalg.norm(query_vec) * np.linalg.norm(pvec) + 1e-10)
            )
            scores.append(cos_sim)
        max_score = max(scores)
        return max_score >= EMERGENCY_SIMILARITY_THRESHOLD, max_score
    except Exception:
        return False, 0.0


def evaluate(
    text: str,
    embed_fn: Optional[object] = None,
) -> dict:
    """
    Run full safety evaluation.

    Returns a dict:
        {
            "emergency": bool,
            "message": str | None,
            "risk_score": float
        }
    """
    keyword_hit = check_keywords(text)

    embedding_hit, similarity_score = check_embedding_similarity(text, embed_fn)

    is_emergency = keyword_hit or embedding_hit
    risk_score = 1.0 if keyword_hit else similarity_score

    return {
        "emergency": is_emergency,
        "message": _EMERGENCY_MESSAGE if is_emergency else None,
        "risk_score": round(risk_score, 4),
    }
