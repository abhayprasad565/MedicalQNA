import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../../frontend/src/pages/HomePage';
import { useThemeSwitcher } from '../../frontend/src/hooks/useThemeSwitcher';

jest.mock('../../frontend/src/hooks/useThemeSwitcher');

describe('HomePage', () => {
  test('includes DarkModeToggle component', () => {
    useThemeSwitcher.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
    });

    render(<HomePage />);
    
    expect(screen.getByRole('button', { name: /Switch to dark mode/i })).toBeInTheDocument();
  });
});
