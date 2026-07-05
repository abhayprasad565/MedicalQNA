import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleDarkMode } from '../state/themeActions';
import { saveThemePreference, getThemePreference } from '../utils/localStorage';
import styled from 'styled-components';

const ToggleButton = styled.button`
  padding: 8px 16px;
  cursor: pointer;
  background-color: var(--header-bg);
  color: var(--header-text);
  border: 1px solid var(--text-color);
  border-radius: 4px;
`;

const DarkModeToggle = () => {
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.theme.darkMode);

  useEffect(() => {
    const savedTheme = getThemePreference();
    if (savedTheme === 'dark') {
      // Since we don't have a specific action to SET dark mode, 
      // and the reducer only toggles, we might need to dispatch toggle if initial is light.
      // But for simplicity based on instructions, we'll handle loading preference.
      // If we want it to be truly consistent, we should have a SET_DARK_MODE action.
      // However, instructions say "handle TOGGLE_DARK_MODE actions by toggling".
      // Let's assume the initial state in reducer is false (light).
      // If saved is 'dark', we dispatch toggle once.
      if (!darkMode) {
        dispatch(toggleDarkMode());
      }
    } else {
      if (darkMode) {
        dispatch(toggleDarkMode());
      }
    }
  }, []); // Run once on mount

  const handleToggle = () => {
    dispatch(toggleDarkMode());
    const newTheme = !darkMode ? 'dark' : 'light';
    saveThemePreference(newTheme);
  };

  useEffect(() => {
    // Update data-theme attribute on html element to trigger CSS variables
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <ToggleButton onClick={handleToggle}>
      {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
    </ToggleButton>
  );
};

export default DarkModeToggle;
