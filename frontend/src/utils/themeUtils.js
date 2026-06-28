/**
 * Detects the system default theme using window.matchMedia.
 * @returns {'dark' | 'light'} The detected system theme.
 */
export const getSystemTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Saves the user's theme preference in localStorage.
 * @param {'dark' | 'light'} theme - The theme preference to save.
 */
export const saveUserPreference = (theme) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    console.error('localStorage is not available');
    return;
  }
  try {
    localStorage.setItem('user-theme', theme);
  } catch (error) {
    console.error('Error saving theme preference to localStorage:', error);
  }
};
