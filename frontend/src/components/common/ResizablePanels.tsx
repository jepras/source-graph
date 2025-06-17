import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  defaultLeftWidth?: number;
  className?: string;
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  rightPanel,
  minLeftWidth = 200,
  maxLeftWidth = 600,
  defaultLeftWidth = 300,
  className = ''
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  // Calculate dynamic max width based on container size (50% of screen)
  const [dynamicMaxWidth, setDynamicMaxWidth] = useState(maxLeftWidth);

  useEffect(() => {
    const updateMaxWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const fiftyPercent = Math.floor(containerWidth * 0.5);
        setDynamicMaxWidth(Math.max(maxLeftWidth, fiftyPercent));
      }
    };

    updateMaxWidth();
    window.addEventListener('resize', updateMaxWidth);
    return () => window.removeEventListener('resize', updateMaxWidth);
  }, [maxLeftWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = e.clientX - containerRect.left;
    
    // Constrain to min/max bounds using dynamic max width
    const constrainedWidth = Math.max(minLeftWidth, Math.min(dynamicMaxWidth, newLeftWidth));
    setLeftWidth(constrainedWidth);
  }, [isDragging, minLeftWidth, dynamicMaxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Function to set left panel to 50% width
  const setToFiftyPercent = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const fiftyPercent = Math.floor(containerWidth * 0.5);
      setLeftWidth(fiftyPercent);
    }
  }, []);

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

  // Keyboard shortcut for 50% width
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === '5') {
        e.preventDefault();
        setToFiftyPercent();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setToFiftyPercent]);

  return (
    <div 
      ref={containerRef}
      className={`flex h-full ${className}`}
      style={{ cursor: isDragging ? 'col-resize' : 'default' }}
    >
      {/* Left Panel */}
      <div 
        className="flex-shrink-0 bg-white border-r border-gray-200 flex flex-col"
        style={{ width: leftWidth }}
      >
        {leftPanel}
      </div>

      {/* Draggable Divider */}
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

        {/* 50% Width Button */}
        <button
          onClick={setToFiftyPercent}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
          title="Set to 50% width"
        >
          50%
        </button>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {rightPanel}
      </div>
    </div>
  );
}; 