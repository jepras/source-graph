import React from 'react';
import { CanvasTab } from '../canvas/CanvasTab';

interface ResearchPanelProps {
  onItemSaved: (itemId: string) => void;
}

export const ResearchPanel: React.FC<ResearchPanelProps> = ({ onItemSaved }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      <CanvasTab onItemSaved={onItemSaved} />
    </div>
  );
};