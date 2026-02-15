"""
Context Loader – parses CSV / TXT history files, chunks, and returns text blocks.
"""

import csv
import io
import re
from typing import Optional

from config import CHUNK_SIZE, CHUNK_OVERLAP


# ── Format detection ────────────────────────────────────────────────────────

def detect_format(content: str) -> str:
    """
    Heuristically decide if *content* is CSV or TXT.
    Returns 'csv' or 'txt'.
    """
    first_line = content.strip().split("\n")[0]
    if "," in first_line and any(
        kw in first_line.lower() for kw in ("timestamp", "role", "message")
    ):
        return "csv"
    return "txt"


# ── Parsers ─────────────────────────────────────────────────────────────────

def _parse_csv(content: str) -> list[str]:
    """
    Expected CSV schema:  timestamp, role, message
    Returns a list of 'role: message' strings.
    """
    reader = csv.DictReader(io.StringIO(content))
    messages: list[str] = []
    for row in reader:
        role = (row.get("role") or "").strip()
        message = (row.get("message") or "").strip()
        if message:
            messages.append(f"{role}: {message}" if role else message)
    return messages


def _parse_txt(content: str) -> list[str]:
    """
    Expected format:
        Patient: I have fever.
        Doctor: Since when?
    Falls back to plain paragraph splitting.
    """
    lines = content.strip().split("\n")
    messages: list[str] = []
    for line in lines:
        line = line.strip()
        if line:
            messages.append(line)
    return messages


# ── Chunker ─────────────────────────────────────────────────────────────────

def chunk_texts(
    texts: list[str],
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    """
    Combine texts into a single document, then split into overlapping
    character-level chunks suitable for embedding.
    """
    full_text = "\n".join(texts)
    chunks: list[str] = []
    start = 0
    while start < len(full_text):
        end = start + chunk_size
        chunk = full_text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


# ── Public API ──────────────────────────────────────────────────────────────

def load_and_chunk(
    content: str,
    fmt: Optional[str] = None,
) -> list[str]:
    """
    Detect format, parse, and chunk the content.
    Returns a list of text chunks ready for embedding.
    """
    fmt = fmt or detect_format(content)
    if fmt == "csv":
        messages = _parse_csv(content)
    else:
        messages = _parse_txt(content)
    return chunk_texts(messages)
