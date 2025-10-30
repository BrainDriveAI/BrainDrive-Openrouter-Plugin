import { CachedModelsPayload, ModelInfo, ModelPricing } from '../types/models';

const MODEL_CACHE_KEY = 'braindrive.openrouter.models.cache';
const FIVE_MINUTES = 5 * 60 * 1000;

const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

export const getModelCache = (ttlMs: number = FIVE_MINUTES): CachedModelsPayload | null => {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    const serialized = window.localStorage.getItem(MODEL_CACHE_KEY);
    if (!serialized) {
      return null;
    }

    const payload: CachedModelsPayload = JSON.parse(serialized);
    if (!payload?.timestamp || !Array.isArray(payload.models)) {
      return null;
    }

    const isExpired = Date.now() - payload.timestamp > ttlMs;
    if (isExpired) {
      window.localStorage.removeItem(MODEL_CACHE_KEY);
      return null;
    }

    return payload;
  } catch (error) {
    console.warn('modelUtils:getModelCache - failed to read cache', error);
    return null;
  }
};

export const setModelCache = (models: ModelInfo[]): void => {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    const payload: CachedModelsPayload = {
      models,
      timestamp: Date.now()
    };
    window.localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('modelUtils:setModelCache - failed to persist cache', error);
  }
};

export const clearModelCache = (): void => {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem(MODEL_CACHE_KEY);
  } catch (error) {
    console.warn('modelUtils:clearModelCache - failed to clear cache', error);
  }
};

export const normalizePricing = (raw: any): ModelPricing | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const prompt = raw.prompt ?? raw.input ?? raw['prompt_price'];
  const completion = raw.completion ?? raw.output ?? raw['completion_price'];

  return {
    prompt,
    completion
  };
};

export const normalizeModelRecord = (record: any): ModelInfo | null => {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const metadata = record.metadata && typeof record.metadata === 'object' ? record.metadata : {};
  const pricing = normalizePricing(metadata.pricing || record.pricing);

  return {
    id: record.id || record.model || record.name,
    name: record.name || record.id || 'Unknown model',
    provider: record.provider || metadata.provider || 'openrouter',
    description: record.description || metadata.description,
    ownedBy: metadata.owned_by || record.owned_by,
    contextLength:
      record.context_length ??
      metadata.context_length ??
      metadata.contextLength ??
      metadata.max_context_length ??
      null,
    pricing,
    metadata
  };
};

export const formatPricing = (pricing?: ModelPricing | null): string => {
  if (!pricing) {
    return 'Usage-based';
  }

  const asString = (value?: number | string | null): string | null => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      if (Number.isNaN(value)) {
        return null;
      }
      return `$${value}`;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
  };

  const prompt = asString(pricing.prompt);
  const completion = asString(pricing.completion);

  if (prompt && completion) {
    return `${prompt} in / ${completion} out`;
  }

  if (prompt) {
    return `${prompt}`;
  }

  if (completion) {
    return `${completion}`;
  }

  return 'Usage-based';
};

export const formatContextLength = (value?: number | null): string => {
  if (!value || Number.isNaN(value)) {
    return '—';
  }

  if (value >= 1000) {
    const asK = (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1);
    return `${asK}K tokens`;
  }

  return `${value} tokens`;
};

