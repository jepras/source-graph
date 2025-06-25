import React from 'react';
import type { ReactNode } from 'react';
import { GraphProvider } from './GraphContext';

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  return (
    <GraphProvider>
      {children}
    </GraphProvider>
  );
};