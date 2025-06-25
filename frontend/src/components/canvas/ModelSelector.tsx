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
  { key: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (fast, slightly interesting)' },
  { key: 'gemini-2.5-pro', name: 'Gemini 2.5 PRO (interesting)' },
  { key: 'perplexity-sonar-reasoning', name: 'Perplexity Sonar (citations, slightly interesting)' },
  { key: 'perplexity', name: 'Perplexity Sonar Large (not recommended)' },
  { key: 'openai', name: 'GPT-4o (not recommended)' }
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
    <div className="flex items-center space-x-2 text-xs text-design-gray-400 hover:text-design-red bg-design-gray-1200 hover:bg-black border border-design-gray-800 hover:border-design-red/30 px-3 py-1.5 rounded-md transition-all duration-200">
      {/* Model Selector */}
      <div className="relative">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className={`
            appearance-none bg-transparent border-none text-design-gray-400 hover:text-design-red pr-6 text-xs
            focus:outline-none focus:ring-0 cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {AVAILABLE_MODELS.map((model) => (
            <option key={model.key} value={model.key} className="bg-design-gray-1200 text-design-gray-100">
              {model.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-0 top-1/2 transform -translate-y-1/2 h-3 w-3 text-design-gray-400 pointer-events-none" />
      </div>

      {/* Separator */}
      <div className="w-px h-3 bg-design-gray-800"></div>

      {/* Two-Agent Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={useTwoAgent}
          onChange={(e) => onTwoAgentChange(e.target.checked)}
          disabled={disabled}
          className="w-3 h-3 text-design-red bg-transparent border border-design-gray-700 rounded focus:ring-design-red focus:ring-1"
        />
        <span className="text-xs">Two-Agent</span>
      </label>
    </div>
  );
}; 