import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { useCanvas } from '../../contexts/CanvasContext';
import { ModelSelector } from './ModelSelector';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type { ActivityLogEntry } from '../../types/canvas';

interface AILogEntry {
  id: string;
  timestamp: string;
  type: "thinking" | "action" | "observation" | "user_input";
  content: string;
  details?: string;
  status: "Added" | "Generated" | "Edited" | "Completed";
  expanded?: boolean;
}

interface ChatInputProps {
  onSubmit: (message: string) => void;
  loading: boolean;
  placeholder?: string;
  // Control props
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  showPromptEditor: boolean;
  setShowPromptEditor: (show: boolean) => void;
  tempPrompt: string;
  setTempPrompt: (prompt: string) => void;
  showActivityLog: boolean;
  setShowActivityLog: (show: boolean) => void;
  logEntries: AILogEntry[];
  toggleLogEntry: (id: string) => void;
  getLogEntryIcon: (type: AILogEntry["type"]) => string;
  promptEditorRef: React.RefObject<HTMLDivElement>;
  activityLogRef: React.RefObject<HTMLDivElement>;
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
  loading, 
  placeholder = "Enter the item you want to research...",
  // Control props
  systemPrompt,
  setSystemPrompt,
  showPromptEditor,
  setShowPromptEditor,
  tempPrompt,
  setTempPrompt,
  showActivityLog,
  setShowActivityLog,
  logEntries,
  toggleLogEntry,
  getLogEntryIcon,
  promptEditorRef,
  activityLogRef
}) => {
  const { state, setSelectedModel, setUseTwoAgent, setLoadingStage } = useCanvas();
  const [message, setMessage] = useState('');
  const [lastActiveModel, setLastActiveModel] = useState<string | null>(null);

  // Convert activity logs to display format
  const activityLogEntries = state.activityLogs.map((log): AILogEntry => ({
    id: log.id,
    timestamp: log.timestamp.toLocaleTimeString(),
    type: getActivityLogType(log.stage),
    content: log.activity,
    details: log.function_called ? `Function: ${log.function_called}${log.duration_ms ? ` (${log.duration_ms}ms)` : ''}` : undefined,
    status: getActivityLogStatus(log.status),
    expanded: false,
  }));

  // Get activity counter for button
  const activityCount = state.activityLogs.length;
  const completedCount = state.activityLogs.filter(log => log.status === 'completed').length;
  const pendingCount = state.activityLogs.filter(log => log.status === 'pending' || log.status === 'in_progress').length;
  
  // Only show counter if there are pending tasks or if we have completed tasks but no pending ones
  const shouldShowCounter = pendingCount > 0 || (completedCount > 0 && pendingCount === 0);

  // Helper function to convert activity log stage to display type
  function getActivityLogType(stage: ActivityLogEntry['stage']): AILogEntry['type'] {
    switch (stage) {
      case 'setup':
      case 'analyzing':
        return 'thinking';
      case 'structuring':
      case 'parsing':
        return 'action';
      case 'complete':
        return 'observation';
      case 'error':
        return 'observation';
      default:
        return 'thinking';
    }
  }

  // Helper function to convert activity log status to display status
  function getActivityLogStatus(status: ActivityLogEntry['status']): AILogEntry['status'] {
    switch (status) {
      case 'pending':
        return 'Added';
      case 'in_progress':
        return 'Generated';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Edited';
      default:
        return 'Added';
    }
  }

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
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.35 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
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
    <div className="bg-design-gray-1100 p-4 rounded-lg">
      {/* Control Buttons - All on same line */}
      <div className="flex items-center justify-start space-x-2 mb-3">
        {/* Model Selector */}
        <ModelSelector
          selectedModel={state.selectedModel}
          onModelChange={setSelectedModel}
          useTwoAgent={state.use_two_agent}
          onTwoAgentChange={setUseTwoAgent}
          disabled={loading}
        />

        {/* System Prompt Dropdown */}
        <div className="relative" ref={promptEditorRef}>
          <button
            onClick={() => {
              setTempPrompt(systemPrompt);
              setShowPromptEditor(!showPromptEditor);
              setShowActivityLog(false);
            }}
            className="flex items-center space-x-2 text-xs text-design-gray-400 hover:text-design-red bg-design-gray-1200 hover:bg-black border border-design-gray-800 hover:border-design-red/30 px-3 py-1.5 rounded-md transition-all duration-200"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Change prompt</span>
            {showPromptEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Prompt Editor Dropdown */}
          {showPromptEditor && (
            <div className="absolute bottom-full left-0 mb-2 w-96 bg-design-gray-1100/95 backdrop-blur-sm border border-design-gray-800 rounded-lg shadow-xl z-50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">System Prompt</h4>
                </div>
                <textarea
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  className="w-full h-32 p-3 bg-design-gray-1200 border border-design-gray-800 rounded-md resize-none focus:ring-1 focus:ring-design-red/50 focus:border-design-red/50 text-design-gray-100 placeholder-design-gray-500 text-xs"
                  placeholder="Enter your system prompt..."
                />
                <div className="flex justify-end space-x-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPromptEditor(false)}
                    className="border-design-gray-800 text-design-gray-400 hover:bg-black hover:text-white text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSystemPrompt(tempPrompt);
                      setShowPromptEditor(false);
                    }}
                    className="bg-design-red hover:bg-design-red-hover text-white border-0 text-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Research Log Dropdown */}
        <div className="relative" ref={activityLogRef}>
          <button
            onClick={() => {
              setShowActivityLog(!showActivityLog);
              setShowPromptEditor(false);
            }}
            className="flex items-center space-x-2 text-xs text-design-gray-400 hover:text-design-red bg-design-gray-1200 hover:bg-black border border-design-gray-800 hover:border-design-red/30 px-3 py-1.5 rounded-md transition-all duration-200"
          >
            <Activity className="w-3 h-3" />
            <span>Research Log</span>
            {shouldShowCounter && (
              <span className="bg-design-red text-white text-xs px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                {completedCount}/{activityCount}
              </span>
            )}
            {showActivityLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Research Log Dropdown */}
          {showActivityLog && (
            <div className="absolute bottom-full mb-2 w-96 bg-design-gray-1100/95 backdrop-blur-sm border border-design-gray-800 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden"
                 style={{ 
                   right: '0px',
                   maxWidth: 'calc(100vw - 2rem)',
                   minWidth: '320px'
                 }}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3 border-b border-design-gray-800 pb-2">
                  <h4 className="text-sm font-medium text-white">Research Log</h4>
                  <div className="flex space-x-2">
                    <span className="text-xs text-design-gray-400 bg-design-gray-900 px-2 py-1 rounded">
                      {pendingCount > 0 ? `${completedCount}/${activityCount} Complete` : `${completedCount} Complete`}
                    </span>
                    <span className="text-xs text-design-gray-500 bg-design-gray-950 px-2 py-1 rounded border border-design-gray-800">
                      Viewing
                    </span>
                  </div>
                </div>
                <div className="space-y-0 max-h-60 overflow-y-auto">
                  {activityLogEntries.length > 0 ? (
                    activityLogEntries.map((entry, index) => {
                      const originalLog = state.activityLogs.find(log => log.id === entry.id);
                      return (
                        <div key={entry.id}>
                          <button
                            onClick={() => toggleLogEntry(entry.id)}
                            className="w-full flex items-start space-x-3 py-2 hover:bg-design-gray-900 rounded transition-colors"
                          >
                            {/* Timeline thread */}
                            <div className="flex flex-col items-center">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                originalLog?.status === 'completed' 
                                  ? 'bg-green-600 border-green-500' 
                                  : originalLog?.status === 'in_progress' 
                                  ? 'bg-blue-600 border-blue-500'
                                  : 'bg-black border-design-red'
                              }`}>
                                <span className="text-xs">{getLogEntryIcon(entry.type)}</span>
                              </div>
                              {index < activityLogEntries.length - 1 && (
                                <div className={`w-0.5 h-6 mt-1 ${
                                  originalLog?.status === 'completed' ? 'bg-green-600' : 'bg-black'
                                }`}></div>
                              )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between">
                                <p className={`text-xs truncate ${
                                  originalLog?.status === 'completed' 
                                    ? 'text-green-300' 
                                    : originalLog?.status === 'in_progress' 
                                    ? 'text-blue-300'
                                    : 'text-design-gray-300'
                                }`}>
                                  {entry.content}
                                </p>
                                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    originalLog?.status === 'completed' 
                                      ? 'text-green-300 bg-green-900/30' 
                                      : originalLog?.status === 'in_progress' 
                                      ? 'text-blue-300 bg-blue-900/30'
                                      : 'text-design-gray-500 bg-design-gray-900/30'
                                  }`}>
                                    {entry.status}
                                  </span>
                                  {(entry.details || entry.content.length > 50) && (
                                    <ChevronDown
                                      className={`w-3 h-3 text-design-gray-500 transition-transform ${
                                        entry.expanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-design-gray-500">{entry.timestamp}</p>
                            </div>
                          </button>
                          {entry.expanded && (
                            <div className="ml-8 pb-2">
                              <p className="text-xs text-design-gray-500 leading-relaxed break-words">
                                {entry.content}
                              </p>
                              {entry.details && (
                                <p className="text-xs text-design-gray-600 leading-relaxed mt-1">
                                  {entry.details}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-design-gray-500">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No activity logs yet</p>
                      <p className="text-xs">Start researching to see detailed logs</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Input */}
      <div className="flex space-x-2">
        <Input
          placeholder={loading ? "AI is thinking..." : placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
          className="flex-1 bg-design-gray-1200 border-design-gray-800 text-design-gray-100 placeholder-design-gray-500 focus:border-design-red focus:ring-design-red/20 [&::placeholder]:text-design-gray-500"
        />
        
        {/* Send Button */}
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || loading}
          size="sm"
          className="bg-design-red hover:bg-design-red-hover text-white border-0 focus:ring-2 focus:ring-design-red/30"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};