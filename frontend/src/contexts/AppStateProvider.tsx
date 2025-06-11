import React, { ReactNode } from 'react';
import { GraphProvider } from './GraphContext';
import { ResearchProvider } from './ResearchContext';

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  return (
    <GraphProvider>
      <ResearchProvider>
        {children}
      </ResearchProvider>
    </GraphProvider>
  );
};