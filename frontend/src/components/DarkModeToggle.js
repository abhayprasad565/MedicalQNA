import React from 'react';
import { useThemeSwitcher } from '../hooks/useThemeSwitcher';

/**
 * DarkModeToggle component provides a button to switch between light and dark themes.
 * It utilizes the useThemeSwitcher hook for state management and persistence.
 * 
 * @returns {JSX.Element} The DarkModeToggle component.
 */
const DarkModeToggle = () => {
  const { theme, setTheme } = useThemeSwitcher();

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  return (
    <button 
      onClick={toggleTheme} 
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className={`theme-toggle-btn ${theme}`}
    >
      {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
    </button>
  );
};

export default DarkModeToggle;
