# 🩺 Medical QNA Chatbot

A full-stack, production-structured medical Q&A chatbot that uses a local LLM (via **Ollama**), **RAG** (Retrieval-Augmented Generation), and a **medical safety engine** — all wrapped in a clean React chat UI.

> ⚠️ **Disclaimer** — This chatbot is for **educational purposes only** and is **not** a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.

---

## 📁 Project Structure

```
Medical QNA/
├── backend/
│   ├── main.py              # FastAPI application & endpoints
│   ├── config.py             # Environment-based configuration
│   ├── llm_client.py         # Ollama HTTP client wrapper
│   ├── embeddings.py         # sentence-transformers embedding module
│   ├── context_loader.py     # CSV/TXT parser & text chunker
│   ├── rag_engine.py         # FAISS vector store & retrieval pipeline
│   ├── safety_engine.py      # Emergency / high-risk symptom detector
│   └── logger.py             # Structured JSON interaction logger
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Root component with disclaimer banner
│       ├── ChatWindow.jsx     # Chat UI with file upload
│       └── api.js             # Fetch wrappers for backend API
├── data/
│   ├── example_history.csv    # Sample CSV chat history
│   └── example_history.txt    # Sample TXT chat history
├── .env.example               # Example environment variables
├── .gitignore
├── requirements.txt           # Python dependencies
└── README.md
```

---

## 🚀 Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Python** | ≥ 3.10 | |
| **Node.js** | ≥ 18 | For the React frontend |
| **Ollama** | latest | Local LLM runtime — https://ollama.com |

### Install & pull an Ollama model

```bash
# macOS
brew install ollama

# Start the Ollama server (keep this running)
ollama serve

# Pull a model (pick one)
ollama pull llama3        # recommended
ollama pull mistral
ollama pull phi
```

---

## ⚙️ Configuration

Copy the example env file and edit as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3` | Model to use for chat |
| `LLM_TEMPERATURE` | `0.4` | Sampling temperature |
| `LLM_MAX_TOKENS` | `1024` | Max completion tokens |
| `LLM_TIMEOUT` | `120` | Request timeout (seconds) |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace model for embeddings |
| `RAG_TOP_K` | `5` | Number of chunks to retrieve |
| `CHUNK_SIZE` | `300` | Characters per chunk |
| `CHUNK_OVERLAP` | `50` | Overlap between chunks |
| `EMERGENCY_SIMILARITY_THRESHOLD` | `0.72` | Cosine-sim threshold for safety |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `LOG_DIR` | `./backend/logs` | Directory for JSON logs |

---

## 🔧 Installation

### Backend

```bash
# Create & activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install Python dependencies
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

---

## ▶️ Running the Application

### 1. Start Ollama (if not already running)

```bash
ollama serve
```

### 2. Start the backend

```bash
# From the project root
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at **http://localhost:8000**.

### 3. Start the frontend

```bash
# In a separate terminal
cd frontend
npm run dev
```

The UI will be available at **http://localhost:5173**.

---

## 📡 API Endpoints

### `POST /chat`

Send a user message and receive an AI response.

**Request:**
```json
{
  "message": "What could cause persistent headaches?",
  "session_id": "optional-uuid"
}
```

**Response:**
```json
{
  "response": "Persistent headaches may indicate...",
  "emergency": false,
  "confidence": 0.78,
  "session_id": "uuid-string"
}
```

### `POST /upload-history`

Upload a CSV or TXT file for RAG ingestion.

- **Accepts:** `multipart/form-data` with field name `file`
- **Supported formats:** `.csv` (timestamp, role, message) and `.txt`

**Response:**
```json
{
  "status": "ok",
  "chunks_added": 12
}
```

### `GET /health`

Liveness probe.

```json
{
  "status": "ok",
  "model": "llama3",
  "vector_store_size": 42
}
```

---

## 🛡️ Safety Engine

The safety module runs **before** any LLM call and detects emergency symptoms:

- Chest pain
- Shortness of breath / difficulty breathing
- Severe abdominal pain
- Stroke symptoms (face droop, arm weakness, slurred speech)
- Suicidal ideation / self-harm
- Severe allergic reaction / anaphylaxis
- Loss of consciousness
- High persistent fever (> 103 °F)
- Uncontrolled bleeding
- Seizures / convulsions
- Overdose / poisoning

When an emergency is detected the system:
1. ❌ Does **not** forward the query to the LLM
2. 🚨 Returns a red-highlighted emergency message
3. 📝 Logs the event to `emergencies.json`

---

## 📊 Logging

All interactions are logged as JSON lines in `backend/logs/`:

| File | Content |
|------|---------|
| `interactions_YYYY-MM-DD.json` | Every chat turn (input, output, model, tokens, session) |
| `emergencies.json` | Emergency-flagged queries |

---

## 🧩 Key Features

- **Configurable LLM** — swap models via `.env` (llama3, mistral, phi, etc.)
- **RAG pipeline** — upload past chat history to improve answer quality
- **Emergency detection** — dual-layer (keyword + embedding similarity)
- **Session memory** — per-session conversation history (last 10 turns)
- **Confidence score** — heuristic confidence returned with every response
- **Token tracking** — prompt & completion token counts logged
- **Structured logging** — JSON-lines format for easy parsing

---

## 📝 License

This project is provided for educational and research purposes.
