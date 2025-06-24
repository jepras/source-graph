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
            appearance-none bg-design-gray-1200 border border-design-gray-800 rounded-md px-3 py-2 pr-8 text-sm text-design-gray-100
            focus:outline-none focus:ring-2 focus:ring-design-red focus:border-design-red
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-design-gray-700'}
          `}
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.key} value={model.key} className="bg-design-gray-1200 text-design-gray-100">
              {model.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-design-gray-400 pointer-events-none" />
      </div>

      {/* Two-Agent Toggle */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-design-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={useTwoAgent}
            onChange={(e) => onTwoAgentChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-design-red bg-design-gray-1200 border-design-gray-700 rounded focus:ring-design-red focus:ring-2"
          />
          <span className="text-xs">Two-Agent</span>
        </label>
        {useTwoAgent && (
          <span className="text-xs text-design-red bg-design-red/10 px-2 py-1 rounded border border-design-red/20">
            Enhanced
          </span>
        )}
      </div>
    </div>
  );
}; 