import React, { useState, useRef, useEffect } from 'react';
import { SearchBar } from '../common/SearchBar';
import { ResearchPanel } from '../panels/ResearchPanel';
import { GraphPanel } from '../panels/GraphPanel';
import { ItemDetailsPanel } from '../panels/ItemDetailsPanel';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { useGraph } from '../../contexts/GraphContext';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import type { Item } from '../../services/api';

export const MainLayout: React.FC = () => {
  const { loadItemInfluences, loadItemInfluencesWithoutSelection, loadItemInfluencesFromTopbar, searchAndLoadItem } = useGraphOperations();
  const { state } = useGraph();
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState("Shaft");
  
  // Panel state management
  const [researchPanelWidth, setResearchPanelWidth] = useState(50); // percentage
  const [isResearchPanelCollapsed, setIsResearchPanelCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(50);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = researchPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.classList.add('select-none');
  };

  // Handle drag move
  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const containerWidth = window.innerWidth;
      const deltaX = e.clientX - dragStartX.current;
      const deltaPercentage = (deltaX / containerWidth) * 100;
      const newWidth = Math.max(20, Math.min(80, dragStartWidth.current + deltaPercentage));
      
      setResearchPanelWidth(newWidth);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('select-none');
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  // Toggle research panel collapse
  const toggleResearchPanel = () => {
    setIsResearchPanelCollapsed(!isResearchPanelCollapsed);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setSearchLoading(true);
    try {
      const results = await searchAndLoadItem(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleItemSelect = async (item: Item) => {
    // Always clear graph for topbar searches and select the new item
    await loadItemInfluencesFromTopbar(item.id);
    setSearchResults([]); // Clear search results
    setSelectedItem(item.name);
  };

  const handleItemSaved = async (itemId: string) => {
    // Don't automatically select the node when an item is saved from research
    // The item details panel should only open when a node is explicitly clicked
    // Just load the item into the graph without selecting it
    await loadItemInfluencesWithoutSelection(itemId);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Panel */}
      <div className="bg-background border-b border-design-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Icon size={24} className="text-design-red" />
              <h1 className="text-xl font-semibold text-white">Influence Graph</h1>
              <span className="text-sm text-design-gray-400">Explore how everything influences everything</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="w-80">
              <SearchBar
                onItemSelect={handleItemSelect}
                onSearch={handleSearch}
                searchResults={searchResults}
                loading={searchLoading}
              />
            </div>
            <span className="text-xs text-design-gray-500">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Bottom Split Panel */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Research Panel - Resizable and Collapsible */}
        <div 
          className={`transition-all duration-300 ease-in-out border-r border-design-gray-800 bg-design-gray-1100 flex flex-col ${
            isResearchPanelCollapsed ? 'w-0 opacity-0' : 'opacity-100'
          }`}
          style={!isResearchPanelCollapsed ? { width: `${researchPanelWidth}%` } : undefined}
        >
          <div className="h-full flex">
            <div className="flex-1 flex flex-col overflow-hidden">
              <ResearchPanel onItemSaved={handleItemSaved} />
            </div>
            
            {/* Resize Handle */}
            <div
              className={`w-2 bg-black hover:bg-design-red cursor-col-resize flex items-center justify-center group transition-colors ${
                isDragging ? 'bg-design-red' : ''
              }`}
              onMouseDown={handleDragStart}
            >
              <div className="w-0.5 h-12 bg-design-gray-600 group-hover:bg-white rounded-full transition-colors" />
            </div>
          </div>
        </div>

        {/* Right Graph Panel - Takes remaining space */}
        <div className="flex-1 overflow-hidden">
          <GraphPanel 
            isResearchPanelCollapsed={isResearchPanelCollapsed}
            onToggleResearchPanel={toggleResearchPanel}
          />
        </div>
      </div>
    </div>
  );
};
