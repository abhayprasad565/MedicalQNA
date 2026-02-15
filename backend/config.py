"""
Configuration module for the Medical QNA backend.
Loads settings from environment variables / .env file.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


# ── Ollama / LLM ───────────────────────────────────────────────────────────
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.4"))
LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "1024"))
LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "120"))

# ── Embeddings ──────────────────────────────────────────────────────────────
EMBEDDING_MODEL: str = os.getenv(
    "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
)

# ── RAG ─────────────────────────────────────────────────────────────────────
RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "5"))
CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "300"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))

# ── Logging ─────────────────────────────────────────────────────────────────
LOG_DIR: str = os.getenv("LOG_DIR", str(Path(__file__).resolve().parent / "logs"))

# ── CORS ────────────────────────────────────────────────────────────────────
FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# ── Safety ──────────────────────────────────────────────────────────────────
EMERGENCY_SIMILARITY_THRESHOLD: float = float(
    os.getenv("EMERGENCY_SIMILARITY_THRESHOLD", "0.72")
)

# ── System prompt ───────────────────────────────────────────────────────────
SYSTEM_PROMPT: str = """You are a medical educational assistant.
You are NOT a doctor.
You do NOT provide diagnosis.
You do NOT prescribe medication.
You provide general informational guidance only.

If symptoms suggest serious risk, advise immediate medical attention.

Use cautious language:
- "This may indicate..."
- "It would be best to consult a healthcare professional."

Never provide definitive diagnosis.
Never provide drug dosages.
Never override emergency instructions."""
