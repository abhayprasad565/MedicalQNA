import { renderHook, act } from '@testing-library/react-hooks';
import { useThemeSwitcher } from '../../frontend/src/hooks/useThemeSwitcher';
import { getSystemTheme, saveUserPreference } from '../../frontend/src/utils/themeUtils';

jest.mock('../../frontend/src/utils/themeUtils', () => ({
  getSystemTheme: jest.fn(),
  saveUserPreference: jest.fn(),
}));

describe('useThemeSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with the correct system theme', () => {
    getSystemTheme.mockReturnValue('dark');
    const { result } = renderHook(() => useThemeSwitcher());
    
    expect(result.current.theme).toBe('dark');
    expect(getSystemTheme).toHaveBeenCalledTimes(1);
  });

  it('should initialize with light theme when getSystemTheme returns light', () => {
    getSystemTheme.mockReturnValue('light');
    const { result } = renderHook(() => useThemeSwitcher());
    
    expect(result.current.theme).toBe('light');
    expect(getSystemTheme).toHaveBeenCalledTimes(1);
  });

  it('should switch theme correctly and save preference', () => {
    getSystemTheme.mockReturnValue('light');
    const { result } = renderHook(() => useThemeSwitcher());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(saveUserPreference).toHaveBeenCalledWith('dark');
    expect(saveUserPreference).toHaveBeenCalledTimes(1);
  });
});
