import React, { useState, useRef, useEffect } from 'react';
import { Send, Save, Loader2 } from 'lucide-react'; // ADD Loader2
import { useCanvas } from '../../contexts/CanvasContext';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onSave: () => void;
  loading: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSubmit, 
  onSave,
  loading, 
  placeholder = "Ask about influences..." 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { state } = useCanvas();

  // Calculate how many sections are selected for graph
  const selectedCount = state.currentDocument?.sections.filter(s => s.selectedForGraph).length || 0;

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
    <div className="flex gap-3 items-end">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "AI is thinking..." : placeholder}
          disabled={loading}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
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
          className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          title={`Save ${selectedCount} selected influences to graph`}
        >
          <Save className="w-4 h-4" />
        </button>
      )}
      
      {/* Send Button with Loading State */}
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || loading}
        className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};