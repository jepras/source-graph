import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableGraphLayoutProps {
  graphPanel: React.ReactNode;
  expansionPanel: React.ReactNode;
  minExpansionWidth?: number;
  maxExpansionWidth?: number;
  defaultExpansionWidth?: number;
  className?: string;
}

export const ResizableGraphLayout: React.FC<ResizableGraphLayoutProps> = ({
  graphPanel,
  expansionPanel,
  minExpansionWidth = 250,
  maxExpansionWidth = 500,
  defaultExpansionWidth = 320,
  className = ''
}) => {
  const [expansionWidth, setExpansionWidth] = useState(defaultExpansionWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    
    // Calculate expansion panel width from right edge
    const newExpansionWidth = containerWidth - mouseX;
    
    // Constrain to min/max bounds
    const constrainedWidth = Math.max(minExpansionWidth, Math.min(maxExpansionWidth, newExpansionWidth));
    setExpansionWidth(constrainedWidth);
  }, [isDragging, minExpansionWidth, maxExpansionWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className={`flex h-full ${className}`}
      style={{ cursor: isDragging ? 'col-resize' : 'default' }}
    >
      {/* Graph Panel */}
      <div className="flex-1 relative">
        {graphPanel}
      </div>

      {/* Collapse Toggle Button - Only show when panel is expanded */}
      {!isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="absolute right-0 top-4 z-10 bg-white border border-gray-200 rounded-l-lg px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
          title="Collapse details panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Expand Toggle Button - Only show when panel is collapsed */}
      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="absolute right-0 top-4 z-10 bg-white border border-gray-200 rounded-l-lg px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
          title="Expand details panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Draggable Divider - Only show when panel is expanded */}
      {!isCollapsed && (
        <div
          ref={dividerRef}
          className="w-2 bg-gray-200 hover:bg-blue-300 cursor-col-resize flex-shrink-0 relative group transition-colors"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'col-resize' : 'col-resize' }}
        >
          {/* Visual indicator for draggable area */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Drag handle */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-8 flex items-center justify-center">
            <div className="w-1 h-12 bg-gray-400 rounded-full group-hover:bg-blue-500 transition-colors flex flex-col items-center justify-center">
              <div className="w-1 h-1 bg-gray-300 rounded-full mb-1 group-hover:bg-blue-300 transition-colors" />
              <div className="w-1 h-1 bg-gray-300 rounded-full mb-1 group-hover:bg-blue-300 transition-colors" />
              <div className="w-1 h-1 bg-gray-300 rounded-full group-hover:bg-blue-300 transition-colors" />
            </div>
          </div>
          
          {/* Tooltip */}
          <div className="absolute top-1/2 left-full ml-2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Drag to resize
          </div>
        </div>
      )}

      {/* Expansion Controls Panel - Only show when not collapsed */}
      {!isCollapsed && (
        <div 
          className="flex-shrink-0 border-l border-gray-200 p-4 overflow-y-auto transition-all duration-200"
          style={{ width: expansionWidth }}
        >
          {expansionPanel}
        </div>
      )}
    </div>
  );
}; 