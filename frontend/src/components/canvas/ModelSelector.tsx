import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  useTwoAgent: boolean;
  onTwoAgentChange: (useTwoAgent: boolean) => void;
  disabled?: boolean;
}

const AVAILABLE_MODELS = [
  { key: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { key: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { key: 'perplexity', name: 'Perplexity Sonar Large' },
  { key: 'perplexity-sonar-reasoning', name: 'Perplexity Sonar Reasoning' },
  { key: 'openai', name: 'GPT-4o' }
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  useTwoAgent,
  onTwoAgentChange,
  disabled = false
}) => {
  const currentModel = AVAILABLE_MODELS.find(m => m.key === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="flex items-center gap-3">
      {/* Model Selector */}
      <div className="relative">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className={`
            appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          `}
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.key} value={model.key}>
              {model.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Two-Agent Toggle */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={useTwoAgent}
            onChange={(e) => onTwoAgentChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-xs">Two-Agent</span>
        </label>
        {useTwoAgent && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            Enhanced
          </span>
        )}
      </div>
    </div>
  );
}; 