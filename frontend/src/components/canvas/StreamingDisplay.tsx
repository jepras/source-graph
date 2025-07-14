import React, { useEffect } from 'react';
import { useCanvas } from '../../contexts/CanvasContext';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface StreamingDisplayProps {
  onComplete?: () => void;
}

interface DisplayMessage {
  type: 'ui' | 'ai';
  content: string;
}

export const StreamingDisplay: React.FC<StreamingDisplayProps> = ({ onComplete }) => {
  const { state } = useCanvas();

  // Call onComplete when streaming finishes
  useEffect(() => {
    if (state.researchState !== 'streaming' && state.streamingOutput.length > 0 && onComplete) {
      onComplete();
    }
  }, [state.researchState, state.streamingOutput.length, onComplete]);

  if (state.researchState !== 'streaming' && state.streamingOutput.length === 0) {
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
        return 'Agent 1: Analyzing cultural influences. This might take a few seconds depending on the model chosen...';
      case 'structuring':
        return 'Agent 2: Structuring the research...';
      default:
        return 'Starting research...';
    }
  };

  const getProgressColor = () => {
    if (state.streamingProgress < 30) return 'bg-design-red';
    if (state.streamingProgress < 70) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Filter and format messages to show only key stages with type distinction
  const getDisplayMessages = (): DisplayMessage[] => {
    const messages: DisplayMessage[] = [];
    
    // Add stage start messages (UI)
    if (state.streamingStage === 'analyzing' || state.streamingStage === 'structuring') {
      messages.push({type: 'ui', content: getStageText()});
    }
    
    // Add continuous text from agent 1 (AI content - markdown)
    if (state.streamingOutput.length > 0) {
      const continuousText = state.streamingOutput.join('');
      if (continuousText.trim()) {
        messages.push({type: 'ai', content: continuousText});
      }
    }
    
    // Add completion messages (UI)
    if (state.researchState !== 'streaming' && state.streamingOutput.length > 0) {
      if (state.streamingStage === 'analyzing') {
        messages.push({type: 'ui', content: 'Agent 1: Finalised research'});
      } else if (state.streamingStage === 'structuring') {
        messages.push({type: 'ui', content: 'Agent 2: Structuring done'});
      }
    }
    
    return messages;
  };

  const displayMessages = getDisplayMessages();

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

      {/* Streaming Output - No auto-scroll */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 font-mono text-sm">
          {displayMessages.length === 0 ? (
            <div className="text-design-gray-400 italic">
              Starting AI analysis...
            </div>
          ) : (
            <div className="text-design-gray-300 leading-relaxed">
              {displayMessages.map((message, index) => (
                <div key={index} className="mb-4">
                  {message.type === 'ai' ? (
                    <div className="markdown-content text-design-gray-300 leading-relaxed">
                      <ReactMarkdown 
                        components={{
                          h1: ({children}) => <h1 className="text-xl font-bold mb-2 text-design-gray-200">{children}</h1>,
                          h2: ({children}) => <h2 className="text-lg font-semibold mb-2 text-design-gray-200">{children}</h2>,
                          h3: ({children}) => <h3 className="text-base font-semibold mb-2 text-design-gray-200">{children}</h3>,
                          p: ({children}) => <p className="mb-2">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 ml-4">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 ml-4">{children}</ol>,
                          li: ({children}) => <li className="mb-1">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-design-gray-200">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          code: ({children}) => <code className="bg-design-gray-800 px-1 rounded text-sm">{children}</code>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-design-gray-600 pl-4 italic mb-2">{children}</blockquote>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>
                  )}
                  {/* Typing cursor for the last message when streaming is active */}
                  {index === displayMessages.length - 1 && state.researchState === 'streaming' && (
                    <span className="inline-block w-2 h-4 bg-design-red animate-pulse ml-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-design-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {state.researchState === 'streaming' ? (
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