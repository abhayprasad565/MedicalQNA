import React from 'react';
import { useTheme } from '../context/ThemeContext';

const DarkModeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        borderRadius: '4px',
        border: '1px solid #ccc',
        backgroundColor: isDarkMode ? '#444' : '#eee',
        color: isDarkMode ? '#fff' : '#000',
        fontSize: '12px',
        transition: 'all 0.3s ease'
      }}
    >
      {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
    </button>
  );
};

export default DarkModeToggle;
