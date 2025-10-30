import React from 'react';
import { ModelTestResult } from '../types/models';

interface TestResultsProps {
  results: ModelTestResult[];
  onClearHistory?: () => void;
}

const formatTimestamp = (timestamp: number): string => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return '';
  }
};

export const TestResults: React.FC<TestResultsProps> = ({ results, onClearHistory }) => {
  return (
    <div className="openrouter-test-results">
      <div className="openrouter-test-results-header">
        <span>Test History</span>
        {results.length > 0 && (
          <button
            type="button"
            className="openrouter-test-results-clear"
            onClick={onClearHistory}
          >
            Clear history
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="openrouter-test-results-empty" role="status">
          No model tests yet. Run a test to view real-time availability details.
        </div>
      ) : (
        <ul className="openrouter-test-results-list">
          {results.map((result) => (
            <li
              key={result.id}
              className={`openrouter-test-result status-${result.status}`}
            >
              <div className="openrouter-test-result-heading">
                <span className="openrouter-test-result-model">{result.modelName}</span>
                <span className="openrouter-test-result-time">
                  {formatTimestamp(result.timestamp)}
                </span>
              </div>
              <div className="openrouter-test-result-message">{result.message}</div>
              {result.details && (
                <div className="openrouter-test-result-details">{result.details}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TestResults;

