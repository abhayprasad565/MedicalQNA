import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, uploadHistory } from './api';

/* ── Inline styles ──────────────────────────────────────────────────────── */

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxWidth: 780,
    margin: '0 auto',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    background: '#0b84fe',
    color: '#fff',
    borderRadius: '18px 18px 4px 18px',
    padding: '10px 16px',
    maxWidth: '75%',
    wordWrap: 'break-word',
    fontSize: 15,
    lineHeight: 1.45,
  },
  bubbleBot: {
    alignSelf: 'flex-start',
    background: '#f0f0f0',
    color: '#1a1a1a',
    borderRadius: '18px 18px 18px 4px',
    padding: '10px 16px',
    maxWidth: '75%',
    wordWrap: 'break-word',
    fontSize: 15,
    lineHeight: 1.45,
  },
  bubbleEmergency: {
    alignSelf: 'flex-start',
    background: '#fdecea',
    color: '#b71c1c',
    border: '2px solid #e53935',
    borderRadius: '18px 18px 18px 4px',
    padding: '10px 16px',
    maxWidth: '75%',
    fontWeight: 600,
    wordWrap: 'break-word',
    fontSize: 15,
    lineHeight: 1.45,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid #e0e0e0',
    background: '#fff',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 15,
    border: '1px solid #ccc',
    borderRadius: 24,
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 22px',
    fontSize: 15,
    fontWeight: 600,
    background: '#0b84fe',
    color: '#fff',
    border: 'none',
    borderRadius: 24,
    cursor: 'pointer',
  },
  sendBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  spinner: {
    alignSelf: 'flex-start',
    padding: '10px 16px',
    color: '#888',
    fontStyle: 'italic',
    fontSize: 14,
  },
  confidence: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
  },
};

/* ── Component ──────────────────────────────────────────────────────────── */

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);   // { role, text, emergency?, confidence? }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const data = await sendMessage(text, sessionId);
      if (data.session_id) setSessionId(data.session_id);

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: data.response,
          emergency: data.emergency,
          confidence: data.confidence,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: `⚠️ Error: ${err.message}`, emergency: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadHistory(file);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `✅ History uploaded – ${result.chunks_added} chunks indexed.`,
          emergency: false,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: `⚠️ Upload error: ${err.message}`, emergency: false },
      ]);
    }
    // reset file input
    e.target.value = '';
  };

  return (
    <div style={styles.container}>
      {/* Message list */}
      <div ref={scrollRef} style={styles.messages}>
        {messages.map((msg, i) => {
          if (msg.role === 'user') {
            return (
              <div key={i} style={styles.bubbleUser}>
                {msg.text}
              </div>
            );
          }
          const bubbleStyle = msg.emergency
            ? styles.bubbleEmergency
            : styles.bubbleBot;
          return (
            <div key={i}>
              <div style={bubbleStyle}>{msg.text}</div>
              {msg.confidence != null && !msg.emergency && (
                <div style={styles.confidence}>
                  Confidence: {(msg.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
        {loading && <div style={styles.spinner}>Thinking…</div>}
      </div>

      {/* Input row */}
      <div style={styles.inputRow}>
        <label
          title="Upload history (CSV / TXT)"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: 20,
            color: '#666',
          }}
        >
          📎
          <input
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </label>

        <input
          style={styles.input}
          type="text"
          placeholder="Type your medical question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendBtn,
            ...(loading || !input.trim() ? styles.sendBtnDisabled : {}),
          }}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
