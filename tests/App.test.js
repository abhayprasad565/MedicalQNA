import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../frontend/src/App';
import { ThemeProvider } from '../frontend/src/theme/ThemeProvider';

// Mock ThemeProvider to verify it's being used
jest.mock('../frontend/src/theme/ThemeProvider', () => {
  const actual = jest.requireActual('../frontend/src/theme/ThemeProvider');
  return {
    ...actual,
    ThemeProvider: jest.fn(({ children }) => <div data-testid="theme-provider">{children}</div>),
  };
});

describe('App Component', () => {
  it('wraps children correctly with ThemeProvider', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('theme-provider')).toBeInTheDocument();
    expect(ThemeProvider).toHaveBeenCalled();
  });
});
