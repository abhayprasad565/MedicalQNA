export const saveThemePreference = (isDarkMode) => {
  localStorage.setItem('theme-preference', isDarkMode ? 'dark' : 'light');
};

export const loadThemePreference = () => {
  const preference = localStorage.getItem('theme-preference');
  return preference === 'dark';
};
