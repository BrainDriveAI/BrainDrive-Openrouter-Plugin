// BrainDrive OpenRouter Plugin - Model data contracts
// These types are used across services and UI components when working with
// the model testing experience. Keep them narrow so the plugin can adapt if
// backend payloads evolve.

export type ModelAvailabilityStatus = 'available' | 'unavailable' | 'unknown';

export interface ModelPricing {
  prompt?: number | string | null;
  completion?: number | string | null;
  cached?: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  ownedBy?: string;
  contextLength?: number | null;
  pricing?: ModelPricing | null;
  /** Raw metadata returned by the backend so we can surface custom fields */
  metadata?: Record<string, any>;
}

export interface ModelTestResult {
  id: string;
  modelId: string;
  modelName: string;
  status: ModelAvailabilityStatus;
  timestamp: number;
  message: string;
  details?: string;
}

export interface CachedModelsPayload {
  models: ModelInfo[];
  timestamp: number;
}

export interface FetchModelsOptions {
  forceRefresh?: boolean;
  /** Useful when we already fetched models and want to reuse them */
  existingModels?: ModelInfo[];
}

