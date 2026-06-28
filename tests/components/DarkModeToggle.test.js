import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DarkModeToggle from '../../frontend/src/components/DarkModeToggle';
import { useThemeSwitcher } from '../../frontend/src/hooks/useThemeSwitcher';

// Mock the useThemeSwitcher hook
jest.mock('../../frontend/src/hooks/useThemeSwitcher');

describe('DarkModeToggle', () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly with initial theme', () => {
    useThemeSwitcher.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    });

    render(<DarkModeToggle />);
    
    expect(screen.getByText('🌙 Dark Mode')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('light');
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode');
  });

  test('renders correctly with dark theme', () => {
    useThemeSwitcher.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
    });

    render(<DarkModeToggle />);
    
    expect(screen.getByText('☀️ Light Mode')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('dark');
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  test('toggles theme correctly and updates UI', () => {
    useThemeSwitcher.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
    });

    render(<DarkModeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
