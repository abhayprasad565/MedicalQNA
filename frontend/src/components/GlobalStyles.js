import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  :root {
    --bg-color: #ffffff;
    --text-color: #000000;
    --header-bg: #f8f9fa;
    --header-text: #333333;
  }

  [data-theme='dark'] {
    --bg-color: #121212;
    --text-color: #ffffff;
    --header-bg: #1f1f1f;
    --header-text: #e0e0e0;
  }

  body {
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: background-color 0.3s ease, color 0.3s ease;
    margin: 0;
    font-family: Arial, sans-serif;
  }

  header {
    background-color: var(--header-bg);
    color: var(--header-text);
    transition: background-color 0.3s ease, color 0.3s ease;
  }
`;

export default GlobalStyle;
