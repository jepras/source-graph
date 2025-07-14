import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../../contexts/CanvasContext';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface StreamingDisplayProps {
  onComplete?: () => void;
}

export const StreamingDisplay: React.FC<StreamingDisplayProps> = ({ onComplete }) => {
  const { state } = useCanvas();
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [state.streamingOutput]);

  // Call onComplete when streaming finishes
  useEffect(() => {
    if (!state.streamingActive && state.streamingOutput.length > 0 && onComplete) {
      onComplete();
    }
  }, [state.streamingActive, state.streamingOutput.length, onComplete]);

  if (!state.streamingActive && state.streamingOutput.length === 0) {
    return null;
  }

  const getStageIcon = () => {
    switch (state.streamingStage) {
      case 'analyzing':
        return <Loader2 className="w-4 h-4 animate-spin text-design-red" />;
      case 'structuring':
        return <Loader2 className="w-4 h-4 animate-spin text-design-blue" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-design-gray-400" />;
    }
  };

  const getStageText = () => {
    switch (state.streamingStage) {
      case 'analyzing':
        return 'Agent 1: Analyzing cultural influences...';
      case 'structuring':
        return 'Agent 2: Structuring analysis...';
      default:
        return 'Starting research...';
    }
  };

  const getProgressColor = () => {
    if (state.streamingProgress < 30) return 'bg-design-red';
    if (state.streamingProgress < 70) return 'bg-design-yellow';
    return 'bg-design-green';
  };

  return (
    <div className="absolute inset-0 bg-design-gray-950 bg-opacity-95 flex flex-col z-20">
      {/* Header */}
      <div className="p-4 border-b border-design-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStageIcon()}
            <div>
              <div className="text-sm font-medium text-design-gray-200">
                {getStageText()}
              </div>
              <div className="text-xs text-design-gray-400">
                Real-time AI analysis in progress...
              </div>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-design-gray-400">
              {state.streamingProgress}%
            </div>
            <div className="w-16 h-2 bg-design-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getProgressColor()} transition-all duration-300 ease-out`}
                style={{ width: `${state.streamingProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Streaming Output */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={outputRef}
          className="h-full overflow-y-auto p-4 font-mono text-sm"
        >
          {state.streamingOutput.length === 0 ? (
            <div className="text-design-gray-400 italic">
              Starting AI analysis...
            </div>
          ) : (
            <div className="space-y-1">
              {state.streamingOutput.map((chunk, index) => (
                <div 
                  key={index} 
                  className="text-design-gray-300 leading-relaxed"
                >
                  {chunk}
                </div>
              ))}
              
              {/* Typing cursor when streaming is active */}
              {state.streamingActive && (
                <span className="inline-block w-2 h-4 bg-design-red animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-design-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {state.streamingActive ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-design-gray-400" />
                <span className="text-design-gray-400">
                  Receiving AI output...
                </span>
              </>
            ) : state.streamingOutput.length > 0 ? (
              <>
                <CheckCircle className="w-3 h-3 text-design-green" />
                <span className="text-design-green">
                  Analysis complete! Processing final document...
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-design-red" />
                <span className="text-design-red">
                  Connection error
                </span>
              </>
            )}
          </div>
          
          <div className="text-design-gray-500">
            {state.streamingOutput.length} chunks received
          </div>
        </div>
      </div>
    </div>
  );
}; 