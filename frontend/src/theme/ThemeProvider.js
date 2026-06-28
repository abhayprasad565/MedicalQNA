import React, { createContext, useMemo } from 'react';
import { useThemeSwitcher } from '../hooks/useThemeSwitcher';

/**
 * ThemeContext provides the current theme and the function to switch it.
 */
export const ThemeContext = createContext(null);

/**
 * ThemeProvider component that manages the theme state and provides it to its children.
 * 
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Children components to be wrapped by the provider.
 * @returns {JSX.Element} The ThemeProvider component.
 */
export const ThemeProvider = ({ children }) => {
  const { theme, setTheme } = useThemeSwitcher();

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
