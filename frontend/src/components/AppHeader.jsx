import React from 'react';
import styled from 'styled-components';
import DarkModeToggle from './DarkModeToggle';

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const AppHeader = () => {
  return (
    <Header>
      <Title>CodeKnight Studio</Title>
      <HeaderActions>
        <DarkModeToggle />
      </HeaderActions>
    </Header>
  );
};

export default AppHeader;
