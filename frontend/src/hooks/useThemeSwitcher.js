import { useState } from 'react';
import { getSystemTheme, saveUserPreference } from '../utils/themeUtils';

/**
 * Hook to manage the application theme.
 * 
 * @returns {{ theme: 'light' | 'dark', setTheme: (theme: 'light' | 'dark') => void }}
 * An object containing the current theme and a function to update it.
 */
export const useThemeSwitcher = () => {
  // Initialize state with the system theme
  const [theme, setThemeState] = useState(getSystemTheme);

  /**
   * Updates the theme state and persists the preference to localStorage.
   * @param {'light' | 'dark'} newTheme - The theme to set.
   */
  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    saveUserPreference(newTheme);
  };

  return { theme, setTheme };
};
