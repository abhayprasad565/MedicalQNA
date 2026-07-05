export const getThemeStyles = (isDarkMode) => {
  return isDarkMode ? {
    backgroundColor: '#1a1a1a',
    color: '#f0f0f0',
    textColor: '#f0f0f0',
    headerColor: '#ffffff',
    containerBackground: '#2d2d2d',
    bannerBackground: '#3c3c3c',
    bannerColor: '#ffd3b6',
  } : {
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
    textColor: '#1a1a1a',
    headerColor: '#1a1a1a',
    containerBackground: '#ffffff',
    bannerBackground: '#fff3cd',
    bannerColor: '#856404',
  };
};
