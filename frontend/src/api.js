const API_BASE = '';  // uses Vite proxy in dev

/**
 * Send a chat message to the backend.
 * @param {string} message
 * @param {string|null} sessionId
 * @returns {Promise<{response: string, emergency: boolean, confidence: number, session_id: string}>}
 */
export async function sendMessage(message, sessionId = null) {
  const body = { message };
  if (sessionId) body.session_id = sessionId;

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Chat request failed (${res.status}): ${detail}`);
  }

  return res.json();
}

/**
 * Upload a CSV or TXT history file for RAG ingestion.
 * @param {File} file
 * @returns {Promise<{status: string, chunks_added: number}>}
 */
export async function uploadHistory(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/upload-history`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload failed (${res.status}): ${detail}`);
  }

  return res.json();
}

/**
 * Health check.
 * @returns {Promise<{status: string, model: string, vector_store_size: number}>}
 */
export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
