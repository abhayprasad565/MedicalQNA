import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider, ThemeContext } from '../../frontend/src/theme/ThemeProvider';
import { getSystemTheme, saveUserPreference } from '../../frontend/src/utils/themeUtils';

jest.mock('../../frontend/src/utils/themeUtils', () => ({
  getSystemTheme: jest.fn(),
  saveUserPreference: jest.fn(),
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides the correct initial theme', () => {
    getSystemTheme.mockReturnValue('dark');

    let capturedContext = null;
    const Consumer = () => {
      capturedContext = React.useContext(ThemeContext);
      return null;
    };

    TestRenderer.create(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(capturedContext).not.toBeNull();
    expect(capturedContext.theme).toBe('dark');
    expect(getSystemTheme).toHaveBeenCalledTimes(1);
  });

  it('switches theme correctly and updates context', () => {
    getSystemTheme.mockReturnValue('light');

    let capturedContext = null;
    const Consumer = () => {
      capturedContext = React.useContext(ThemeContext);
      return null;
    };

    const renderer = TestRenderer.create(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(capturedContext.theme).toBe('light');

    // Act: Switch theme
    act(() => {
      capturedContext.setTheme('dark');
    });

    expect(capturedContext.theme).toBe('dark');
    expect(saveUserPreference).toHaveBeenCalledWith('dark');
  });
});
