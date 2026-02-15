"""
Medical QNA – FastAPI application entry point.

Endpoints:
    POST /chat            – Send a message and receive an AI response
    POST /upload-history  – Upload CSV/TXT history for RAG ingestion
    GET  /health          – Liveness check
"""

import traceback
import uuid
from typing import Optional

from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import config
import llm_client
import safety_engine
import rag_engine
import embeddings as emb
import logger as log

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Medical QNA Chatbot",
    version="1.0.0",
    description="Educational medical Q&A chatbot powered by Ollama + RAG.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all so unhandled errors return a clear JSON payload."""
    traceback.print_exc()          # still print to console for debugging
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc}"},
    )

# ── In-memory conversation store (per session) ─────────────────────────────
_conversations: dict[str, list[dict]] = {}

MAX_HISTORY_TURNS = 10  # keep last N exchanges


# ── Request / Response models ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    emergency: bool
    confidence: float
    session_id: str


class UploadResponse(BaseModel):
    status: str
    chunks_added: int


class HealthResponse(BaseModel):
    status: str
    model: str
    vector_store_size: int


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())
    user_text = req.message.strip()

    # 1) Safety check – BEFORE anything else
    safety = safety_engine.evaluate(user_text, embed_fn=emb.embed_text)

    if safety["emergency"]:
        log.log_emergency(user_input=user_text, session_id=session_id)
        log.log_interaction(
            user_input=user_text,
            llm_output=safety["message"],
            emergency=True,
            model=config.OLLAMA_MODEL,
            session_id=session_id,
            confidence=1.0,
        )
        return ChatResponse(
            response=safety["message"],
            emergency=True,
            confidence=1.0,
            session_id=session_id,
        )

    # 2) Retrieve RAG context
    rag_context = rag_engine.retrieve_context(user_text)

    # 3) Fetch conversation history (real multi-turn messages)
    history = _conversations.get(session_id, [])

    # 4) Compose the current-turn prompt (RAG context + question)
    parts: list[str] = []
    if rag_context:
        parts.append(f"### Relevant Medical Context\n{rag_context}")
    parts.append(user_text)

    prompt = "\n\n".join(parts)

    # 5) Call LLM — pass history as real multi-turn messages
    try:
        result = await llm_client.generate(
            prompt,
            system=config.SYSTEM_PROMPT,
            history=history,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    response_text = result["text"]
    token_usage = result["token_usage"]

    # 6) Basic confidence heuristic (ratio of completion length to prompt length)
    total_tokens = (token_usage.get("prompt_tokens", 0) + token_usage.get("completion_tokens", 0)) or 1
    confidence = round(
        min(token_usage.get("completion_tokens", 0) / total_tokens, 0.99), 2
    )

    # 7) Store conversation turn
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": response_text})
    _conversations[session_id] = history[-MAX_HISTORY_TURNS * 2 :]

    # 8) Log
    log.log_interaction(
        user_input=user_text,
        llm_output=response_text,
        emergency=False,
        model=result["model"],
        session_id=session_id,
        confidence=confidence,
        token_usage=token_usage,
    )

    return ChatResponse(
        response=response_text,
        emergency=False,
        confidence=confidence,
        session_id=session_id,
    )


@app.post("/upload-history", response_model=UploadResponse)
async def upload_history(file: UploadFile = File(...)):
    if file.content_type not in (
        "text/csv",
        "text/plain",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Use CSV or TXT.",
        )

    raw = await file.read()
    content = raw.decode("utf-8", errors="ignore")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    chunks_added = rag_engine.ingest_content(content)

    return UploadResponse(status="ok", chunks_added=chunks_added)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        model=config.OLLAMA_MODEL,
        vector_store_size=rag_engine.get_store().size,
    )


# ── Dev entry point ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
