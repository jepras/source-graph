import React, { useState, useRef, useEffect } from 'react';
import { Send, Save, Loader2 } from 'lucide-react'; // ADD Loader2
import { useCanvas } from '../../contexts/CanvasContext';
import { ModelSelector } from './ModelSelector';
import { ModelStatus } from './ModelStatus';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onSave: () => void;
  loading: boolean;
  placeholder?: string;
}

const MODEL_NAMES: Record<string, string> = {
  'perplexity': 'Perplexity Sonar Large',
  'perplexity-sonar-reasoning': 'Perplexity Sonar Reasoning',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'openai': 'GPT-4o'
};

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSubmit, 
  onSave,
  loading, 
  placeholder = "Ask about influences..." 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { state, setSelectedModel, setUseTwoAgent } = useCanvas();
  const [lastActiveModel, setLastActiveModel] = useState(state.activeModel);

  // Calculate how many sections are selected for graph
  const selectedCount = state.currentDocument?.sections.filter(s => s.selectedForGraph).length || 0;

  // Show fallback notification
  useEffect(() => {
    if (lastActiveModel !== state.activeModel && state.activeModel !== state.selectedModel) {
      // Model changed due to fallback
      const selectedName = MODEL_NAMES[state.selectedModel] || state.selectedModel;
      const activeName = MODEL_NAMES[state.activeModel] || state.activeModel;
      
      // Create a simple toast notification
      const toast = document.createElement('div');
      toast.className = `
        fixed top-4 right-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg shadow-lg z-50
        flex items-center gap-2 max-w-sm
      `;
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          <div>
            <div class="font-medium">Model Fallback</div>
            <div class="text-sm">Switched from ${selectedName} to ${activeName}</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(toast);
      
      // Remove toast after 4 seconds
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 4000);
    }
    
    setLastActiveModel(state.activeModel);
  }, [state.activeModel, state.selectedModel, lastActiveModel]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim() || loading) return;
    
    onSubmit(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      {/* Model Selection and Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-design-gray-300">Model:</label>
          <ModelSelector
            selectedModel={state.selectedModel}
            onModelChange={setSelectedModel}
            useTwoAgent={state.use_two_agent}
            onTwoAgentChange={setUseTwoAgent}
            disabled={loading}
          />
        </div>
        
        <ModelStatus
          selectedModel={state.selectedModel}
          activeModel={state.activeModel}
          loading={loading}
        />
      </div>

      {/* Chat Input */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loading ? "AI is thinking..." : placeholder}
            disabled={loading}
            className="w-full p-3 border border-design-gray-800 rounded-lg resize-none focus:ring-2 focus:ring-design-green focus:border-design-green disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-design-gray-900 bg-design-gray-900 text-design-gray-100 placeholder-design-gray-500"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <div className="absolute bottom-2 right-2 text-xs text-design-gray-500">
            {loading ? "Generating..." : (
              <>
                {message.length > 0 && `${message.length} chars • `}
                ⌘↵ to send
              </>
            )}
          </div>
        </div>
        
        {/* Save Button */}
        {selectedCount > 0 && !loading && (
          <button
            onClick={onSave}
            className="p-3 bg-design-green text-white rounded-lg hover:bg-design-green-hover focus:ring-2 focus:ring-design-green focus:ring-offset-2 focus:ring-offset-design-gray-950 transition-colors"
            title={`Save ${selectedCount} selected influences to graph`}
          >
            <Save className="w-4 h-4" />
          </button>
        )}
        
        {/* Send Button with Loading State */}
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || loading}
          className="p-3 bg-design-green text-white rounded-lg hover:bg-design-green-hover focus:ring-2 focus:ring-design-green focus:ring-offset-2 focus:ring-offset-design-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};