import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '../../frontend/src/pages/SettingsPage';
import { useThemeSwitcher } from '../../frontend/src/hooks/useThemeSwitcher';

jest.mock('../../frontend/src/hooks/useThemeSwitcher');

describe('SettingsPage', () => {
  test('includes DarkModeToggle component', () => {
    useThemeSwitcher.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
    });

    render(<SettingsPage />);
    
    expect(screen.getByRole('button', { name: /Switch to dark mode/i })).toBeInTheDocument();
  });
});
