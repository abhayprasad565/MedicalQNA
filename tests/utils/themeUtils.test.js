import { getSystemTheme, saveUserPreference } from '../../frontend/src/utils/themeUtils';

describe('themeUtils', () => {
  beforeEach(() => {
    // Clear localStorage and mocks before each test
    localStorage.clear();
    jest.clearAllMocks();
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  describe('getSystemTheme', () => {
    it("should return 'dark' when system prefers dark mode", () => {
      window.matchMedia.mockImplementation(query => ({
        matches: true,
        media: query,
      }));
      expect(getSystemTheme()).toBe('dark');
    });

    it("should return 'light' when system prefers light mode", () => {
      window.matchMedia.mockImplementation(query => ({
        matches: false,
        media: query,
      }));
      expect(getSystemTheme()).toBe('light');
    });

    it("should return 'light' as default when window.matchMedia is not available", () => {
      const originalMatchMedia = window.matchMedia;
      delete window.matchMedia;
      try {
        expect(getSystemTheme()).toBe('light');
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    });
  });

  describe('saveUserPreference', () => {
    it("should save theme preference in localStorage", () => {
      saveUserPreference('dark');
      expect(localStorage.getItem('user-theme')).toBe('dark');
      
      saveUserPreference('light');
      expect(localStorage.getItem('user-theme')).toBe('light');
    });

    it("should handle localStorage unavailability gracefully", () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: null,
        configurable: true
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      saveUserPreference('dark');
      expect(consoleSpy).toHaveBeenCalledWith('localStorage is not available');
      
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true
      });
      consoleSpy.mockRestore();
    });

    it("should handle localStorage.setItem errors gracefully", () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      saveUserPreference('dark');
      expect(consoleSpy).toHaveBeenCalledWith('Error saving theme preference to localStorage:', expect.any(Error));
      
      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });

  });
});
