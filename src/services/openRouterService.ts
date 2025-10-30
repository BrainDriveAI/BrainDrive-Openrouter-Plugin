import { FetchModelsOptions, ModelInfo, ModelTestResult } from '../types/models';
import {
  clearModelCache,
  getModelCache,
  normalizeModelRecord,
  setModelCache
} from '../utils/modelUtils';

const PROVIDER = 'openrouter';
const SETTINGS_ID = 'openrouter_api_keys_settings';
const SERVER_ID = 'openrouter_default_server';
const USER_ID = 'current';

export interface OpenRouterApiClient {
  get: (url: string, options?: any) => Promise<any>;
  post?: (url: string, data?: any, options?: any) => Promise<any>;
}

export class OpenRouterService {
  constructor(private readonly api?: OpenRouterApiClient) {}

  async fetchModels(options?: FetchModelsOptions): Promise<ModelInfo[]> {
    const forceRefresh = options?.forceRefresh ?? false;

    if (!forceRefresh) {
      const cached = getModelCache();
      if (cached) {
        return cached.models;
      }
    }

    if (!this.api?.get) {
      throw new Error('API service unavailable');
    }

    const params = {
      provider: PROVIDER,
      settings_id: SETTINGS_ID,
      server_id: SERVER_ID,
      user_id: USER_ID
    };

    const response = await this.api.get('/api/v1/ai/providers/models', { params });

    const rawModels =
      Array.isArray(response) ? response : response?.models ?? response?.data?.models ?? [];

    const models = (rawModels as any[])
      .map(normalizeModelRecord)
      .filter((model): model is ModelInfo => Boolean(model && model.id));

    if (!models.length) {
      throw new Error('No models returned from OpenRouter');
    }

    setModelCache(models);
    return models;
  }

  async testModelAvailability(modelId: string, models?: ModelInfo[]): Promise<ModelTestResult> {
    const timestamp = Date.now();
    const availableModels = models && models.length ? models : await this.fetchModels();

    const match =
      availableModels.find(
        (model) => model.id === modelId || model.name === modelId
      ) ?? null;

    if (match) {
      return {
        id: `${match.id}-${timestamp}`,
        modelId: match.id,
        modelName: match.name,
        status: 'available',
        timestamp,
        message: `${match.name} is available via OpenRouter.`
      };
    }

    // If the model was not found, clear the cache so the next attempt refetches.
    clearModelCache();

    return {
      id: `${modelId}-${timestamp}`,
      modelId,
      modelName: modelId,
      status: 'unavailable',
      timestamp,
      message: 'Model not listed by OpenRouter for the current account.'
    };
  }
}

export const createOpenRouterService = (api?: OpenRouterApiClient): OpenRouterService =>
  new OpenRouterService(api);

