import React, { useState, useRef, useEffect } from 'react';
import { SearchBar } from '../common/SearchBar';
import { ResearchPanel } from '../panels/ResearchPanel';
import { GraphPanel } from '../panels/GraphPanel';
import { ItemDetailsPanel } from '../panels/ItemDetailsPanel';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { useGraph } from '../../contexts/GraphContext';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import type { Item } from '../../services/api';

export const MainLayout: React.FC = () => {
  const { loadItemInfluences, searchAndLoadItem } = useGraphOperations();
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
    await loadItemInfluences(item.id);
    setSearchResults([]); // Clear search results
    setSelectedItem(item.name);
  };

  const handleItemSaved = async (itemId: string) => {
    await loadItemInfluences(itemId);
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Top Panel */}
      <div className="bg-black border-b border-design-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-design-red rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">IG</span>
              </div>
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
          className={`transition-all duration-300 border-r border-design-gray-800 bg-black flex flex-col ${
            isResearchPanelCollapsed ? 'w-12' : ''
          }`}
          style={!isResearchPanelCollapsed ? { width: `${researchPanelWidth}%` } : undefined}
        >
          {isResearchPanelCollapsed ? (
            // Collapsed state - just show toggle button
            <div className="h-full flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleResearchPanel}
                className="p-2 hover:bg-design-gray-900"
              >
                <ChevronRight className="w-4 h-4 text-design-gray-400" />
              </Button>
            </div>
          ) : (
            // Expanded state - show panel with resize handle
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
          )}
        </div>

        {/* Collapse/Expand Button */}
        {!isResearchPanelCollapsed && (
          <div className="absolute left-0 top-2 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleResearchPanel}
              className="p-1.5 bg-design-gray-950 border border-design-gray-800 hover:bg-design-gray-900"
            >
              <ChevronLeft className="w-3 h-3 text-design-gray-400" />
            </Button>
          </div>
        )}

        {/* Right Graph Panel - Takes remaining space */}
        <div className="flex-1 overflow-hidden">
          <GraphPanel />
        </div>
      </div>
    </div>
  );
};
