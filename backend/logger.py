"""
Logging utility – stores structured JSON logs for every interaction.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from config import LOG_DIR


def _ensure_log_dir() -> Path:
    p = Path(LOG_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


def log_interaction(
    *,
    user_input: str,
    llm_output: str,
    emergency: bool,
    model: str,
    session_id: Optional[str] = None,
    confidence: Optional[float] = None,
    token_usage: Optional[dict] = None,
) -> None:
    """Append a single interaction record to today's log file."""
    log_dir = _ensure_log_dir()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log_file = log_dir / f"interactions_{today}.json"

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": session_id,
        "user_input": user_input,
        "llm_output": llm_output,
        "emergency": emergency,
        "model": model,
        "confidence": confidence,
        "token_usage": token_usage,
    }

    # Append to JSON-lines file (one JSON object per line)
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def log_emergency(*, user_input: str, session_id: Optional[str] = None) -> None:
    """Dedicated emergency event log."""
    log_dir = _ensure_log_dir()
    log_file = log_dir / "emergencies.json"

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": session_id,
        "user_input": user_input,
    }

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
