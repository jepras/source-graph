import React from 'react';
import { AppStateProvider } from './contexts/AppStateProvider';
import { MainLayout } from './components/layout/MainLayout';
import './index.css';

function App() {
  return (
    <AppStateProvider>
      <MainLayout />
    </AppStateProvider>
  );
}

export default App;