import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ModelStatusProps {
  selectedModel: string;
  activeModel: string;
  loading: boolean;
}

const MODEL_NAMES: Record<string, string> = {
  'perplexity': 'Perplexity Sonar Large',
  'perplexity-sonar-reasoning': 'Perplexity Sonar Reasoning',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'openai': 'GPT-4o'
};

export const ModelStatus: React.FC<ModelStatusProps> = ({
  selectedModel,
  activeModel,
  loading
}) => {
  const isFallback = activeModel !== selectedModel;
  const selectedName = MODEL_NAMES[selectedModel] || selectedModel;
  const activeName = MODEL_NAMES[activeModel] || activeModel;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-design-gray-400">
        <Loader2 className="w-4 h-4 animate-spin text-design-red" />
        <span>AI thinking...</span>
      </div>
    );
  }

  if (isFallback) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        <span className="text-design-gray-400">Selected: {selectedName}</span>
        <span className="text-amber-400 font-medium">→</span>
        <span className="text-amber-400">Using: {activeName}</span>
        <span className="text-xs text-design-gray-400 bg-design-gray-1200 px-2 py-1 rounded border border-design-gray-800">
          fallback
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-design-gray-400">
      <CheckCircle className="w-4 h-4 text-design-red" />
      <span>Using: {activeName}</span>
    </div>
  );
}; 