import React from 'react';
import { ModelInfo } from '../types/models';
import { formatContextLength, formatPricing } from '../utils/modelUtils';

interface ModelTesterProps {
  selectedModel: ModelInfo | null;
  onTestModel: () => void;
  isTesting: boolean;
  disabled?: boolean;
}

export const ModelTester: React.FC<ModelTesterProps> = ({
  selectedModel,
  onTestModel,
  isTesting,
  disabled = false
}) => {
  const isDisabled = disabled || !selectedModel || isTesting;
  const disabledMessage =
    !selectedModel && !disabled
      ? 'Choose a model to enable testing.'
      : disabled
      ? 'Model testing unavailable until a valid API key is saved.'
      : null;

  return (
    <div className="openrouter-model-tester">
      <div className="openrouter-model-details" aria-live="polite">
        {selectedModel ? (
          <>
            <div className="openrouter-model-name">{selectedModel.name}</div>
            <div className="openrouter-model-meta">
              <span>{selectedModel.provider || 'OpenRouter'}</span>
              {selectedModel.contextLength && (
                <span>{formatContextLength(selectedModel.contextLength)}</span>
              )}
              {selectedModel.pricing && <span>{formatPricing(selectedModel.pricing)}</span>}
            </div>
          </>
        ) : (
          <div className="openrouter-model-placeholder">
            Select a model to view its details.
          </div>
        )}
      </div>

      <button
        type="button"
        className="openrouter-test-button"
        onClick={onTestModel}
        disabled={isDisabled}
      >
        {isTesting ? 'Testing model…' : 'Test Model Availability'}
      </button>

      {disabledMessage && (
        <div className="openrouter-test-helper" role="status">
          {disabledMessage}
        </div>
      )}
    </div>
  );
};

export default ModelTester;

