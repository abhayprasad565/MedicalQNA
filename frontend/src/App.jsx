import React from 'react';
import AppHeader from './components/AppHeader';
import ChatWindow from './ChatWindow';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { getThemeStyles } from './styles/theme';

const AppContent = () => {
  const { isDarkMode } = useTheme();
  const theme = getThemeStyles(isDarkMode);

  const bannerStyle = {
    background: theme.bannerBackground,
    color: theme.bannerColor,
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

  const appContainer = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: theme.backgroundColor,
    color: theme.color,
  };

  return (
    <div style={appContainer} className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <AppHeader />

      <div style={bannerStyle}>
        ⚠️ This chatbot is for <strong>educational purposes only</strong> and is
        not a substitute for professional medical advice, diagnosis, or
        treatment.
      </div>

      <ChatWindow />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
