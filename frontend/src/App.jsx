import React from 'react';
import ChatWindow from './ChatWindow';

const bannerStyle = {
  background: '#fff3cd',
  color: '#856404',
  border: '1px solid #ffc107',
  borderRadius: 8,
  padding: '10px 16px',
  margin: '16px 16px 0',
  maxWidth: 780,
  marginLeft: 'auto',
  marginRight: 'auto',
  fontSize: 14,
  fontWeight: 500,
  textAlign: 'center',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
};

const headerStyle = {
  textAlign: 'center',
  padding: '20px 0 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
  color: '#1a1a1a',
};

const appContainer = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  background: '#fafafa',
};

export default function App() {
  return (
    <div style={appContainer}>
      <h2 style={headerStyle}>🩺 Medical QNA Chatbot</h2>

      <div style={bannerStyle}>
        ⚠️ This chatbot is for <strong>educational purposes only</strong> and is
        not a substitute for professional medical advice, diagnosis, or
        treatment.
      </div>

      <ChatWindow />
    </div>
  );
}
