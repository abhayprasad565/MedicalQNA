# 📖 Medical QNA — Full Codebase Deep-Dive

> A file-by-file explanation of what every piece does, how data flows through the system, and how the parts connect.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Request Lifecycle](#request-lifecycle)
3. [Chat History & Session Context](#chat-history--session-context)
4. [Project Root Files](#project-root-files)
   - [requirements.txt](#requirementstxt)
   - [.env](#env)
   - [README.md](#readmemd)
5. [Backend](#backend)
   - [config.py](#backendconfigpy)
   - [main.py](#backendmainpy)
   - [llm_client.py](#backendllm_clientpy)
   - [embeddings.py](#backendembeddingspy)
   - [context_loader.py](#backendcontext_loaderpy)
   - [rag_engine.py](#backendrag_enginepy)
   - [safety_engine.py](#backendsafety_enginepy)
   - [logger.py](#backendloggerpy)
6. [Frontend](#frontend)
   - [index.html](#frontendindexhtml)
   - [package.json](#frontendpackagejson)
   - [vite.config.js](#frontendviteconfigjs)
   - [main.jsx](#frontendsrcmainjsx)
   - [App.jsx](#frontendsrcappjsx)
   - [ChatWindow.jsx](#frontendsrcchatwindowjsx)
   - [api.js](#frontendsrcapijs)
7. [Data Files](#data-files)
   - [example_history.csv](#dataexample_historycsv)
   - [example_history.txt](#dataexample_historytxt)
8. [Data-Flow Diagram](#data-flow-diagram)

---

## High-Level Architecture

```
┌────────────────────┐        HTTP (Vite proxy)       ┌──────────────────────┐
│   React Frontend   │  ────────────────────────────▶  │   FastAPI Backend    │
│   (localhost:5173)  │  ◀────────────────────────────  │   (localhost:8000)   │
└────────────────────┘         JSON responses          └──────────┬───────────┘
                                                                  │
                                                    ┌─────────────┼──────────────┐
                                                    │             │              │
                                              ┌─────▼────┐ ┌─────▼─────┐ ┌──────▼──────┐
                                              │  Safety   │ │  RAG /    │ │   Ollama    │
                                              │  Engine   │ │  FAISS    │ │   LLM API   │
                                              └──────────┘ └───────────┘ └─────────────┘
```

The app is a **two-tier** system:

| Layer | Tech | Purpose |
|-------|------|---------|
| **Frontend** | React 18 + Vite | Chat UI, file upload, disclaimer display |
| **Backend** | FastAPI (Python) | Safety check → RAG retrieval → LLM call → response |
| **LLM Runtime** | Ollama (local) | Runs the actual language model (deepseek-r1, llama3, etc.) |
| **Vector Store** | FAISS (in-memory) | Stores & retrieves embedded text chunks for RAG |

---

## Request Lifecycle

When a user types a question and hits **Send**, this is the exact sequence of events:

```
 User types "What causes headaches?" → clicks Send
         │
         ▼
 [1] ChatWindow.jsx calls sendMessage() from api.js
         │
         ▼
 [2] api.js does fetch("/chat", { method: "POST", body: { message, session_id } })
         │
         ▼
 [3] Vite dev server proxies /chat → http://localhost:8000/chat
         │
         ▼
 [4] FastAPI endpoint (main.py → chat()) receives the request
         │
         ▼
 [5] safety_engine.evaluate() runs FIRST
     ├── check_keywords(): regex patterns against the input
     └── check_embedding_similarity(): cosine-sim vs curated emergency phrases
     If emergency → immediately return red alert message, skip LLM
         │
         ▼
 [6] rag_engine.retrieve_context(): FAISS similarity search
     Returns top-K relevant chunks (if any history was uploaded)
         │
         ▼
 [7] Conversation history is fetched from in-memory dict (per session_id)
     Returns a list of {role, content} dicts (last 10 turns = 20 messages)
         │
         ▼
 [8] A prompt is assembled: [RAG context] + [current question]
     (history is NOT flattened into the prompt — see next step)
         │
         ▼
 [9] llm_client.generate() sends the prompt + history to Ollama HTTP API
     POST http://localhost:11434/api/chat
     messages: [system] + [prior user/assistant turns] + [current user message]
     The LLM sees real multi-turn conversation, not pasted text
         │
         ▼
[10] Ollama returns the completion, token counts
         │
         ▼
[11] main.py computes a confidence score, stores the turn in session memory
         │
         ▼
[12] logger.py writes the interaction to a JSON-lines log file
         │
         ▼
[13] FastAPI returns { response, emergency, confidence, session_id }
         │
         ▼
[14] ChatWindow.jsx renders the bot bubble with the response
```

---

## Chat History & Session Context

**Yes, the system has full multi-turn chat history context.** Here's exactly how it works across the frontend and backend:

### How Sessions Are Created

1. On the **first** message, the frontend sends `session_id: null`.
2. The backend generates a UUID (`str(uuid.uuid4())`) and returns it in the response.
3. The frontend stores this in React state (`setSessionId(data.session_id)`).
4. **Every subsequent message** includes this `session_id`, linking all turns to the same conversation.

### How History Is Stored (Backend)

```python
# In-memory dict — lives as long as the server process
_conversations: dict[str, list[dict]] = {}
MAX_HISTORY_TURNS = 10  # keep last 10 exchanges (20 messages)
```

- **Key:** `session_id` (UUID string)
- **Value:** List of `{"role": "user"|"assistant", "content": "..."}` dicts
- After each turn, both the user message and assistant response are appended
- The list is trimmed to `MAX_HISTORY_TURNS * 2` (20 messages = 10 back-and-forth turns)
- **Volatile:** All history is lost when the server restarts (no database)

### How History Is Sent to the LLM

The conversation history is passed as **real multi-turn messages** in the Ollama API call — not flattened into a single text block. This gives the LLM proper conversational context:

```json
{
  "model": "deepseek-r1:8b",
  "messages": [
    {"role": "system",    "content": "You are a medical educational assistant..."},
    {"role": "user",      "content": "What causes headaches?"},
    {"role": "assistant", "content": "Headaches can be caused by..."},
    {"role": "user",      "content": "What about migraines specifically?"},
    {"role": "assistant", "content": "Migraines are a neurological condition..."},
    {"role": "user",      "content": "[RAG context]\n\nAre they hereditary?"}
  ]
}
```

The **system prompt** comes first, then all prior turns in order, then the current user message (which may include RAG context prepended).

### How History Is Displayed (Frontend)

```jsx
const [messages, setMessages] = useState([]);
// Each entry: { role: 'user'|'bot', text, emergency?, confidence? }
```

- The frontend keeps its **own** copy of all messages in React state.
- User messages are added **optimistically** (before the API responds).
- Bot responses are appended when the API returns.
- The `session_id` is stored in React state and sent with every request.
- **Page refresh clears the frontend history** (React state is ephemeral).

### Lifecycle of a Multi-Turn Conversation

```
Turn 1:  Frontend sends {message: "hi", session_id: null}
         Backend creates session "abc-123", stores turn, returns response
         Frontend saves sessionId = "abc-123"

Turn 2:  Frontend sends {message: "what about fever?", session_id: "abc-123"}
         Backend loads history for "abc-123" → [{user: "hi"}, {assistant: "Hello!"}]
         Sends to Ollama: [system] + [user: hi] + [assistant: Hello!] + [user: what about fever?]
         Ollama sees the full conversation, responds in context

Turn 3:  Same pattern — history now has 4 messages (2 turns)
         ...and so on up to 10 turns (20 messages), then oldest turns are dropped
```

### Limitations

| Limitation | Detail |
|------------|--------|
| **In-memory only** | History is lost on server restart — no database persistence |
| **No cross-device sync** | Session ID lives in browser state only |
| **Max 10 turns** | Older turns are silently dropped to keep token counts manageable |
| **Page refresh = new session** | Frontend state resets; backend history orphaned |
| **Single process** | With multiple workers, sessions may not be found |

---

## Project Root Files

### `requirements.txt`

**Purpose:** Declares all Python package dependencies for `pip install`.

| Package | Why It's Needed |
|---------|-----------------|
| `fastapi` | Web framework – powers all HTTP endpoints |
| `uvicorn[standard]` | ASGI server – runs the FastAPI app |
| `httpx` | Async HTTP client – used to call the Ollama API |
| `python-dotenv` | Loads `.env` file into `os.environ` |
| `python-multipart` | Required by FastAPI for `UploadFile` / form-data parsing |
| `pydantic` | Data validation – request/response models in `main.py` |
| `sentence-transformers` | HuggingFace library – generates text embedding vectors |
| `faiss-cpu` | Facebook's vector similarity search – powers the RAG retrieval |
| `numpy` | Array operations – used by embeddings and FAISS |

### `.env`

**Purpose:** Runtime configuration. Loaded by `config.py` via `python-dotenv`.

Every variable here maps to a constant in `config.py`. Changing a value here changes the app's behavior without touching code. Key entries:

- `OLLAMA_MODEL` — which LLM to use (e.g., `deepseek-r1:8b`)
- `LLM_TIMEOUT` — max seconds to wait for an LLM response
- `EMERGENCY_SIMILARITY_THRESHOLD` — how similar a query must be to an emergency phrase to trigger the safety alert
- `FRONTEND_ORIGIN` — CORS allowed origin
- `LOG_DIR` — where interaction logs are stored

### `README.md`

**Purpose:** User-facing documentation. Setup instructions, API reference, feature list. Not used by the application at runtime.

---

## Backend

All backend files live in `backend/`. The server is started with:
```
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

### `backend/config.py`

**Role:** Centralized configuration — the single source of truth for all settings.

**How it works:**
1. Uses `Path(__file__).resolve().parent.parent / ".env"` to find the `.env` file in the project root.
2. Calls `load_dotenv()` to inject those values into `os.environ`.
3. Reads each setting with `os.getenv("KEY", "default")`, casting to the right type.

**Key constants exposed:**

| Constant | Type | Used By |
|----------|------|---------|
| `OLLAMA_BASE_URL` | `str` | `llm_client.py` — Ollama server address |
| `OLLAMA_MODEL` | `str` | `llm_client.py`, `main.py` — which model to call |
| `LLM_TEMPERATURE` | `float` | `llm_client.py` — controls randomness (0 = deterministic, 1 = creative) |
| `LLM_MAX_TOKENS` | `int` | `llm_client.py` — caps response length |
| `LLM_TIMEOUT` | `int` | `llm_client.py` — request timeout in seconds |
| `EMBEDDING_MODEL` | `str` | `embeddings.py` — HuggingFace model name |
| `RAG_TOP_K` | `int` | `rag_engine.py` — how many chunks to retrieve |
| `CHUNK_SIZE` | `int` | `context_loader.py` — character width of each chunk |
| `CHUNK_OVERLAP` | `int` | `context_loader.py` — overlap between consecutive chunks |
| `EMERGENCY_SIMILARITY_THRESHOLD` | `float` | `safety_engine.py` — cosine-sim cutoff |
| `FRONTEND_ORIGIN` | `str` | `main.py` — CORS whitelist |
| `LOG_DIR` | `str` | `logger.py` — output directory for JSON logs |
| `SYSTEM_PROMPT` | `str` | `main.py` → `llm_client.py` — instructs the LLM on behavior (be cautious, no diagnosis, no prescriptions) |

**Dependency graph:** Every other backend module imports from `config.py`. It has **no** imports from other project modules (leaf node).

---

### `backend/main.py`

**Role:** The **FastAPI application entry point** — defines all HTTP endpoints and orchestrates the full pipeline.

**Structure:**

```
Imports
    ↓
App creation + CORS middleware
    ↓
Global exception handler
    ↓
In-memory conversation store (_conversations dict)
    ↓
Pydantic models (ChatRequest, ChatResponse, UploadResponse, HealthResponse)
    ↓
Endpoints:
    POST /chat           → chat()
    POST /upload-history → upload_history()
    GET  /health         → health()
    ↓
Dev entry point (__main__)
```

**Endpoint detail — `POST /chat`:**

```python
async def chat(req: ChatRequest):
```

1. Generates or reuses a `session_id` (UUID).
2. Calls `safety_engine.evaluate()` — if emergency detected, returns immediately without calling the LLM.
3. Calls `rag_engine.retrieve_context()` — fetches relevant chunks from FAISS.
4. Loads conversation history from `_conversations[session_id]` (last 10 turns, 20 messages).
5. Builds the current-turn prompt: `[RAG context] + [user question]` (history is sent separately).
6. Calls `llm_client.generate(prompt, system=SYSTEM_PROMPT, history=history)` — prior turns are sent as real multi-turn messages.
7. Computes a confidence score: `completion_tokens / total_tokens` (heuristic).
8. Appends the user/assistant turn to session memory.
9. Logs via `logger.log_interaction()`.
10. Returns `{ response, emergency, confidence, session_id }`.

**Endpoint detail — `POST /upload-history`:**

Accepts a `multipart/form-data` file upload. Reads the file, decodes as UTF-8, then calls `rag_engine.ingest_content()` to chunk, embed, and store the text in FAISS.

**Endpoint detail — `GET /health`:**

Returns the current model name and the number of vectors in the FAISS store.

**Key data structures:**

- `_conversations: dict[str, list[dict]]` — Maps `session_id` → list of `{"role": "user"|"assistant", "content": "..."}`. Kept in memory (lost on restart). Trimmed to `MAX_HISTORY_TURNS * 2` entries (10 turns = 20 messages).

---

### `backend/llm_client.py`

**Role:** Async HTTP wrapper around the **Ollama REST API**.

**Single function:**

```python
async def generate(prompt, *, system, history, model, temperature, max_tokens) -> dict
```

| Parameter | Type | Purpose |
|-----------|------|------|
| `prompt` | `str` | The current user message (may include RAG context) |
| `system` | `str` | System prompt that sets LLM behaviour |
| `history` | `list[dict] \| None` | Prior conversation turns as `{"role": "user"\|"assistant", "content": "..."}` |
| `model` | `str \| None` | Override the configured model |
| `temperature` | `float \| None` | Override the configured temperature |
| `max_tokens` | `int \| None` | Override the configured max tokens |

**What it does:**

1. Builds a `messages` array (OpenAI-style): system message → prior conversation turns → current user message.
2. Constructs a JSON payload:
   ```json
   {
     "model": "deepseek-r1:8b",
     "messages": [
       {"role": "system", "content": "You are a medical..."},
       {"role": "user", "content": "prior question"},
       {"role": "assistant", "content": "prior answer"},
       {"role": "user", "content": "[RAG context]\n\ncurrent question"}
     ],
     "stream": false,
     "options": { "temperature": 0.4, "num_predict": 1024 }
   }
   ```
3. Sends `POST {OLLAMA_BASE_URL}/api/chat` using `httpx.AsyncClient`.
4. Parses the response and returns:
   ```python
   {
     "text": "The LLM's response text",
     "model": "deepseek-r1:8b",
     "token_usage": { "prompt_tokens": 150, "completion_tokens": 300 }
   }
   ```

By sending history as actual message objects (not text pasted into the prompt), the LLM treats them as real conversational turns, producing more coherent multi-turn responses.

**Error handling:**
- `httpx.TimeoutException` → `RuntimeError` ("Ollama timed out")
- `httpx.HTTPStatusError` → `RuntimeError` ("Ollama returned HTTP 4xx/5xx")
- `httpx.ConnectError` → `RuntimeError` ("Cannot connect to Ollama")

All of these are caught in `main.py` and converted to HTTP 502 responses.

---

### `backend/embeddings.py`

**Role:** Thin wrapper around the `sentence-transformers` library for generating **text embeddings** (dense vector representations of text).

**Key details:**

- Uses a **singleton pattern**: `_model` is `None` initially, created once on first call via `_get_model()`, then reused.
- Default model: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional vectors, fast, lightweight).

**Functions:**

| Function | Input | Output | Used By |
|----------|-------|--------|---------|
| `embed_text(text)` | single string | `np.ndarray` shape `(384,)` | `safety_engine.py`, `rag_engine.py` (single-query embedding) |
| `embed_texts(texts)` | list of strings | `np.ndarray` shape `(N, 384)` | `rag_engine.py` (batch embedding for ingestion) |

Both return **L2-normalized** vectors (`normalize_embeddings=True`), so cosine similarity = dot product.

---

### `backend/context_loader.py`

**Role:** Parses uploaded history files (CSV or TXT) and splits them into **chunks** suitable for embedding & RAG retrieval.

**Pipeline:**

```
Raw text content
    │
    ▼
detect_format(content)          →  "csv" or "txt"
    │
    ▼
_parse_csv(content)  OR  _parse_txt(content)
    │                          │
    ▼                          ▼
List of message strings    List of line strings
    │
    ▼
chunk_texts(messages, chunk_size=300, overlap=50)
    │
    ▼
List of overlapping text chunks (ready for embedding)
```

**Format detection (`detect_format`):**
Looks at the first line — if it contains commas AND keywords like "timestamp", "role", "message", it's CSV. Otherwise TXT.

**CSV parser (`_parse_csv`):**
Expects columns: `timestamp, role, message`. Outputs `"role: message"` strings (e.g., `"Patient: I have a headache"`).

**TXT parser (`_parse_txt`):**
Splits on newlines, trims whitespace, keeps non-empty lines.

**Chunker (`chunk_texts`):**
1. Joins all messages with `\n` into one long string.
2. Slides a window of `chunk_size` characters across it, stepping by `chunk_size - overlap`.
3. Returns a list of overlapping text chunks.

The overlap ensures information at chunk boundaries isn't lost during retrieval.

---

### `backend/rag_engine.py`

**Role:** Manages the **FAISS vector store** and provides the RAG (Retrieval-Augmented Generation) pipeline.

**Core class — `VectorStore`:**

```python
class VectorStore:
    dimension = 384          # must match embedding model
    index: faiss.IndexFlatIP # inner-product index (cosine after L2-norm)
    texts: list[str]         # parallel list of raw text chunks
```

| Method | What It Does |
|--------|--------------|
| `add(chunks)` | Embeds all chunks via `emb.embed_texts()`, L2-normalizes, adds to FAISS index, appends raw text to `self.texts` |
| `search(query, top_k)` | Embeds the query, L2-normalizes, runs `index.search()`, returns `[{"text": ..., "score": ...}, ...]` |
| `clear()` | Resets the index and clears stored texts |
| `size` (property) | Returns `index.ntotal` — number of vectors stored |

**Singleton pattern:**
`_store` is a module-level variable. `get_store()` creates it once, returns the same instance forever (per-process).

**Pipeline functions:**

| Function | Called By | Purpose |
|----------|-----------|---------|
| `ingest_content(content)` | `main.py → upload_history()` | Parses + chunks content via `context_loader`, adds to FAISS |
| `retrieve_context(query)` | `main.py → chat()` | Searches FAISS, returns formatted context string with relevance scores |

**Why FAISS IndexFlatIP?**
`IndexFlatIP` = brute-force inner product search. Since all vectors are L2-normalized, inner product equals cosine similarity. It's exact (not approximate), fine for small-to-medium datasets.

---

### `backend/safety_engine.py`

**Role:** Detects **medical emergencies** in user input BEFORE the LLM is ever called.

**Two detection layers:**

#### Layer 1 — Keyword Matching (`check_keywords`)

A list of ~30 compiled regex patterns covering:
- Chest pain, breathing difficulty
- Stroke symptoms (face droop, arm weakness, slurred speech)
- Suicidal ideation / self-harm
- Anaphylaxis / severe allergic reaction
- Loss of consciousness
- High fever (>103°F)
- Uncontrolled bleeding
- Seizures, overdose, poisoning

Returns `True` if **any** pattern matches. This is fast (microseconds) and always runs.

#### Layer 2 — Embedding Similarity (`check_embedding_similarity`)

Compares the user's input against 18 curated emergency phrases (e.g., "I am having chest pain", "I want to kill myself") using cosine similarity of their embedding vectors.

- Embeds the user input and each emergency phrase.
- Computes cosine similarity for each pair.
- If the max similarity ≥ `EMERGENCY_SIMILARITY_THRESHOLD` (default 0.72), it's flagged.

This catches paraphrased emergencies that keywords miss (e.g., "my chest feels like it's being crushed").

#### Combined Evaluation (`evaluate`)

```python
def evaluate(text, embed_fn) -> {
    "emergency": bool,       # True if EITHER layer triggered
    "message": str | None,   # The 🚨 emergency message, or None
    "risk_score": float       # 1.0 if keyword hit, else max cosine-sim
}
```

When an emergency is detected:
- The LLM is **never called**.
- A hardcoded emergency message is returned: *"🚨 This may indicate a medical emergency. Please seek immediate medical care..."*
- The event is logged separately to `emergencies.json`.

---

### `backend/logger.py`

**Role:** Writes structured **JSON-lines** log files for every interaction and emergency event.

**Functions:**

| Function | Output File | When Called |
|----------|-------------|-------------|
| `log_interaction(...)` | `logs/interactions_YYYY-MM-DD.json` | After every `/chat` response (both normal and emergency) |
| `log_emergency(...)` | `logs/emergencies.json` | Only when safety engine flags an emergency |

**Log record schema (interaction):**
```json
{
  "timestamp": "2026-02-15T12:00:00+00:00",
  "session_id": "uuid-string",
  "user_input": "What causes headaches?",
  "llm_output": "Headaches may be caused by...",
  "emergency": false,
  "model": "deepseek-r1:8b",
  "confidence": 0.85,
  "token_usage": { "prompt_tokens": 120, "completion_tokens": 350 }
}
```

Files are **append-only** (one JSON object per line). A new interactions file is created each day.

`_ensure_log_dir()` creates the logs directory if it doesn't exist.

---

## Frontend

The frontend is a **React 18 SPA** bundled with **Vite**. Started with:
```
cd frontend && npm run dev
```

---

### `frontend/index.html`

**Role:** The single HTML page that hosts the React app.

- Contains a `<div id="root"></div>` mount point.
- Loads `/src/main.jsx` as an ES module.
- The `<title>` is "Medical QNA Chatbot".

Vite uses this as the entry point and injects its dev client for HMR (Hot Module Replacement).

---

### `frontend/package.json`

**Role:** Node.js project manifest — defines scripts and dependencies.

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Starts the Vite dev server with HMR on port 5173 |
| `build` | `vite build` | Produces a production bundle in `dist/` |
| `preview` | `vite preview` | Serves the production build locally |

**Runtime dependencies:** `react`, `react-dom`
**Dev dependencies:** `vite`, `@vitejs/plugin-react`, TypeScript type definitions for React (used for IDE support only — no TypeScript compilation).

---

### `frontend/vite.config.js`

**Role:** Vite build tool configuration.

**Key settings:**

1. **`plugins: [react()]`** — Enables JSX transform and React Fast Refresh (HMR).

2. **`server.port: 5173`** — Dev server port.

3. **`server.proxy`** — This is critical. It proxies API routes from the frontend dev server to the backend:

   ```
   /chat           → http://localhost:8000/chat
   /upload-history → http://localhost:8000/upload-history
   /health         → http://localhost:8000/health
   ```

   The `/chat` proxy has `timeout: 120000` (120 seconds) to handle slow LLM responses without dropping the connection.

   **Why a proxy?** The frontend uses relative URLs (e.g., `fetch("/chat")`). In dev mode, Vite intercepts these and forwards them to the backend, avoiding CORS issues. In production, you'd configure a reverse proxy (nginx) instead.

---

### `frontend/src/main.jsx`

**Role:** React application entry point.

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Creates the React root, mounts `<App />` inside `StrictMode` (which enables additional development warnings).

---

### `frontend/src/App.jsx`

**Role:** Root component — sets up the page layout.

**Renders:**
1. A centered header: `🩺 Medical QNA Chatbot`
2. A yellow disclaimer banner warning that the chatbot is for educational purposes only.
3. The `<ChatWindow />` component (the actual chat UI).

Uses a full-viewport-height flex layout (`height: 100vh`) with a light gray background.

---

### `frontend/src/ChatWindow.jsx`

**Role:** The main chat UI component — handles all user interaction.

**State:**

| State Variable | Type | Purpose |
|----------------|------|---------|
| `messages` | `Array<{role, text, emergency?, confidence?}>` | All chat messages displayed |
| `input` | `string` | Current text input value |
| `loading` | `boolean` | True while waiting for LLM response |
| `sessionId` | `string \| null` | Tracks the conversation session across turns |

**Key behaviors:**

1. **Send message (`handleSend`):**
   - Adds user message to state immediately (optimistic UI).
   - Calls `sendMessage()` from `api.js`.
   - On success: adds bot response bubble.
   - On error: adds an error bubble with the error message.
   - Enter key triggers send (Shift+Enter does not).

2. **File upload (`handleUpload`):**
   - Triggered by the 📎 button (hidden file input).
   - Accepts `.csv` and `.txt` files.
   - Calls `uploadHistory()` from `api.js`.
   - Shows a success/error message as a bot bubble.

3. **Auto-scroll:**
   - A `useEffect` watches `messages` and `loading` — scrolls to bottom whenever they change.

4. **Message rendering:**
   - **User bubbles:** Blue, right-aligned.
   - **Bot bubbles:** Gray, left-aligned, with a confidence percentage shown below.
   - **Emergency bubbles:** Red border, red background, red text — distinct styling for safety alerts.
   - **Loading state:** Shows "Thinking…" in italic while waiting.

---

### `frontend/src/api.js`

**Role:** API client — wraps all `fetch()` calls to the backend.

**Functions:**

| Function | HTTP Call | Purpose |
|----------|-----------|---------|
| `sendMessage(message, sessionId)` | `POST /chat` | Sends a chat message, returns `{ response, emergency, confidence, session_id }` |
| `uploadHistory(file)` | `POST /upload-history` | Uploads a file via `FormData`, returns `{ status, chunks_added }` |
| `healthCheck()` | `GET /health` | Returns `{ status, model, vector_store_size }` |

**`API_BASE = ''`** — Uses an empty base URL, so all fetches go to the same origin (Vite dev server), which then proxies to the backend.

Error handling: If `res.ok` is false, reads the response body as text and throws an `Error` with the status code and detail. This error is caught in `ChatWindow.jsx` and displayed to the user.

---

## Data Files

### `data/example_history.csv`

**Format:** CSV with columns `timestamp, role, message`.

Contains 3 sample patient-doctor conversations:
1. Persistent headache → tension headache diagnosis
2. Sore throat + mild fever → viral infection guidance
3. Twisted ankle → Grade 1 sprain treatment

**Used for:** Testing the file upload + RAG pipeline. Upload this via the 📎 button to populate the FAISS vector store.

### `data/example_history.txt`

**Format:** Plain text, one message per line in `Role: Message` format.

Contains 3 sample conversations:
1. Lower back pain → muscular diagnosis
2. Dizziness on standing → orthostatic hypotension
3. Child with runny nose → common cold guidance

**Used for:** Same as above — tests the TXT parsing path in `context_loader.py`.

---

## Data-Flow Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │              FRONTEND (React)               │
                    │                                             │
                    │  ChatWindow.jsx                             │
                    │    ├── input state (user typing)            │
                    │    ├── messages state (chat history)        │
                    │    └── calls api.js functions               │
                    │                                             │
                    │  api.js                                     │
                    │    ├── sendMessage()  → POST /chat          │
                    │    ├── uploadHistory()→ POST /upload-history│
                    │    └── healthCheck() → GET /health          │
                    └──────────────┬──────────────────────────────┘
                                   │  Vite Proxy (dev mode)
                                   ▼
                    ┌─────────────────────────────────────────────┐
                    │              BACKEND (FastAPI)              │
                    │                                             │
                    │  main.py                                    │
                    │    │                                        │
                    │    ├──▶ safety_engine.evaluate()            │
                    │    │     ├── check_keywords() (regex)       │
                    │    │     └── check_embedding_similarity()   │
                    │    │           └── embeddings.embed_text()  │
                    │    │                                        │
                    │    ├──▶ rag_engine.retrieve_context()       │
                    │    │     └── VectorStore.search()           │
                    │    │           └── embeddings.embed_text()  │
                    │    │                                        │
                    │    ├──▶ _conversations[session_id]          │
                    │    │     └── last 10 turns of chat history  │
                    │    │                                        │
                    │    ├──▶ llm_client.generate(prompt,history) │
                    │    │     └── POST to Ollama API ────────────┼──▶ Ollama
                    │    │          messages: [sys]+[history]+[q]  │    (localhost:11434)
                    │    └──▶ logger.log_interaction()            │
                    │          └── writes to logs/*.json          │
                    │                                             │
                    │  config.py (reads .env, provides constants) │
                    └─────────────────────────────────────────────┘

    Upload flow:
    main.py upload_history()
        └──▶ rag_engine.ingest_content()
               └──▶ context_loader.load_and_chunk()
               └──▶ VectorStore.add()
                      └──▶ embeddings.embed_texts()
                      └──▶ faiss index.add()
```

---

## Module Dependency Graph

```
config.py              ← leaf (no project imports)
    ▲
    │
    ├── embeddings.py        ← imports config
    │       ▲
    │       ├── safety_engine.py   ← imports config, uses embed_fn passed in
    │       ├── rag_engine.py      ← imports config, embeddings, context_loader
    │       │       ▲
    │       │       │
    │       └───────┤
    │               │
    ├── context_loader.py    ← imports config
    │               │
    ├── llm_client.py        ← imports config
    │               │
    ├── logger.py            ← imports config
    │               │
    └───────────────┴──▶ main.py  ← imports ALL of the above, orchestrates everything
```

---

*Generated for reverse-engineering reference. Every function, class, and data path in the project is covered above.*
