"""
Ollama LLM client wrapper.

Communicates with the Ollama HTTP API for chat completions.
"""

import httpx
from typing import Optional

from config import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    LLM_TIMEOUT,
)


async def generate(
    prompt: str,
    *,
    system: str = "",
    history: Optional[list[dict]] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> dict:
    """
    Send a prompt to Ollama and return the response.

    Args:
        prompt: The current user message.
        system: System prompt to set LLM behaviour.
        history: Prior conversation turns as a list of
                 {"role": "user"|"assistant", "content": "..."}.
                 These are sent as real multi-turn messages so the
                 model has true conversational context.
        model: Override the configured model.
        temperature: Override the configured temperature.
        max_tokens: Override the configured max tokens.

    Returns:
        {
            "text": str,
            "model": str,
            "token_usage": { "prompt_tokens": int, "completion_tokens": int }
        }
    """
    model = model or OLLAMA_MODEL
    temperature = temperature if temperature is not None else LLM_TEMPERATURE
    max_tokens = max_tokens or LLM_MAX_TOKENS

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    # Append prior conversation turns so the LLM sees real back-and-forth
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

            return {
                "text": data.get("message", {}).get("content", ""),
                "model": model,
                "token_usage": {
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0),
                },
            }

    except httpx.TimeoutException:
        raise RuntimeError(
            f"Ollama request timed out after {LLM_TIMEOUT}s. "
            "Is the Ollama server running?"
        )
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"Ollama returned HTTP {exc.response.status_code}: "
            f"{exc.response.text[:300]}"
        )
    except httpx.ConnectError:
        raise RuntimeError(
            f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. "
            "Make sure the Ollama server is running."
        )
