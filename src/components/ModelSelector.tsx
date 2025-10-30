import React from 'react';
import { ModelInfo } from '../types/models';
import { formatContextLength, formatPricing } from '../utils/modelUtils';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string | null;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onModelSelect: (modelId: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const buildOptionLabel = (model: ModelInfo): string => {
  const parts: string[] = [model.name];

  if (model.ownedBy) {
    parts.push(`by ${model.ownedBy}`);
  }

  if (model.contextLength) {
    parts.push(formatContextLength(model.contextLength));
  }

  const pricing = formatPricing(model.pricing);
  if (pricing) {
    parts.push(pricing);
  }

  return parts.join(' • ');
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  searchTerm,
  onSearchTermChange,
  onModelSelect,
  isLoading,
  disabled = false
}) => {
  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onModelSelect(event.target.value);
  };

  const placeholderText = isLoading
    ? 'Loading models…'
    : disabled
      ? 'Model testing unavailable'
      : 'Choose a model';

  return (
    <div className="openrouter-model-selector" role="group" aria-label="Model selection">
      <div className="openrouter-model-selector-header">
        <label htmlFor="openrouter-model-dropdown">Select a model to test</label>
        <span className="openrouter-model-count" aria-live="polite">
          {models.length} model{models.length === 1 ? '' : 's'} available
        </span>
      </div>

      <div className="openrouter-model-search">
        <input
          id="openrouter-model-search"
          type="search"
          value={searchTerm}
          placeholder="Search by model name or provider…"
          onChange={(event) => onSearchTermChange(event.target.value)}
          aria-label="Filter models by name or provider"
          disabled={isLoading || disabled}
        />
      </div>

      <select
        id="openrouter-model-dropdown"
        value={selectedModel || ''}
        onChange={handleSelect}
        disabled={isLoading || disabled || models.length === 0}
      >
        <option value="" disabled>
          {placeholderText}
        </option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {buildOptionLabel(model)}
          </option>
        ))}
      </select>

      {models.length === 0 && !isLoading && !disabled && (
        <div className="openrouter-model-empty" role="status">
          No models available. Confirm that your API key is valid and has access to OpenRouter models.
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
