import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfilePage from '../../frontend/src/pages/ProfilePage';
import { useThemeSwitcher } from '../../frontend/src/hooks/useThemeSwitcher';

jest.mock('../../frontend/src/hooks/useThemeSwitcher');

describe('ProfilePage', () => {
  test('includes DarkModeToggle component', () => {
    useThemeSwitcher.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
    });

    render(<ProfilePage />);
    
    expect(screen.getByRole('button', { name: /Switch to dark mode/i })).toBeInTheDocument();
  });
});
