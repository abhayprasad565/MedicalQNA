import React from 'react';
import DarkModeToggle from './DarkModeToggle';

const AppHeader = () => {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      borderBottom: '1px solid #ddd'
    }}>
      <h2 style={{ margin: 0 }}>🩺 Medical QNA Chatbot</h2>
      <DarkModeToggle />
    </header>
  );
};

export default AppHeader;
