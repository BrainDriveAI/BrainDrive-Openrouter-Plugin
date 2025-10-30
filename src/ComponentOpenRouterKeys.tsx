import React from 'react';
import './ComponentOpenRouterKeys.css';
import { KeyIcon, EyeIcon, EyeOffIcon, SaveIcon, InfoIcon, CheckIcon, ClearIcon, TestConnectionIcon } from './icons';
import { ModelSelector } from './components/ModelSelector';
import { ModelTester } from './components/ModelTester';
import { TestResults } from './components/TestResults';
import { ModelInfo, ModelTestResult } from './types/models';
import { createOpenRouterService, OpenRouterService } from './services/openRouterService';
import { clearModelCache } from './utils/modelUtils';

// Minimal service interfaces to align with Service Bridge patterns
interface ApiService {
  get: (url: string, options?: any) => Promise<any>;
  post: (url: string, data: any) => Promise<any>;
}

interface ThemeService {
  getCurrentTheme: () => string;
  addThemeChangeListener: (callback: (theme: string) => void) => void;
  removeThemeChangeListener: (callback: (theme: string) => void) => void;
}

interface SettingsServiceBridge {
  getSetting: (name: string, context?: { userId?: string; pageId?: string }) => Promise<any>;
  setSetting: (name: string, value: any, context?: { userId?: string; pageId?: string }) => Promise<void>;
  registerSettingDefinition?: (definition: any) => Promise<void>;
  getSettingDefinitions?: (filter?: { category?: string; tags?: string[] }) => Promise<any[]>;
  subscribe?: (key: string, callback: (value: any) => void) => () => void;
}

interface ComponentOpenRouterKeysProps {
  pluginId?: string;
  moduleId?: string;
  instanceId?: string;
  services?: {
    api?: ApiService;
    theme?: ThemeService;
    settings?: SettingsServiceBridge;
  };
}

interface ComponentOpenRouterKeysState {
  apiKey: string;
  savedApiKey: string;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  testResult: string | null;
  testError: string | null;
  isKeyVisible: boolean;
  isSaving: boolean;
  isTesting: boolean;
  currentTheme: string;
  showTooltip: boolean;
  hasUnsavedChanges: boolean;
  tooltipPosition: { top: number; left: number } | null;
  activeTab: 'api-key' | 'model-testing';
  modelsLoaded: boolean;
  modelsLoading: boolean;
  availableModels: ModelInfo[];
  modelSearchTerm: string;
  selectedModelId: string | null;
  modelTestResults: ModelTestResult[];
  modelTabError: string | null;
  isModelTesting: boolean;
}

// OpenRouter Settings Configuration
const OPENROUTER_SETTINGS = {
  DEFINITION_ID: 'openrouter_api_keys_settings',
  // Align category naming with other working modules and backend
  CATEGORY: 'LLM Servers',
  SCHEMA: {
    type: 'object',
    properties: {
      apiKey: { type: 'string' },
      enabled: { type: 'boolean' },
      baseUrl: { type: 'string' },
      defaultModel: { type: 'string' },
      modelPreferences: { type: 'object' },
      requestTimeout: { type: 'number' },
      maxRetries: { type: 'number' }
    }
  },
  DEFAULT_VALUE: {
    apiKey: '',
    enabled: true,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-3.5-turbo',
    modelPreferences: {},
    requestTimeout: 30,
    maxRetries: 3
  }
};

class ComponentOpenRouterKeys extends React.Component<
  ComponentOpenRouterKeysProps,
  ComponentOpenRouterKeysState
> {
  private openRouterService: OpenRouterService;
  private settingsUnsubscribe?: () => void;
  private themeChangeListener: ((theme: string) => void) | null = null;
  private infoIconRef = React.createRef<HTMLDivElement>();

  constructor(props: ComponentOpenRouterKeysProps) {
    super(props);
    this.openRouterService = createOpenRouterService(this.props.services?.api);
    this.state = {
      apiKey: '',
      savedApiKey: '',
      isLoading: true,
      error: null,
      success: null,
      testResult: null,
      testError: null,
      isKeyVisible: false,
      isSaving: false,
      isTesting: false,
      currentTheme: 'dark',
      showTooltip: false,
      hasUnsavedChanges: false,
      tooltipPosition: null,
      activeTab: 'api-key',
      modelsLoaded: false,
      modelsLoading: false,
      availableModels: [],
      modelSearchTerm: '',
      selectedModelId: null,
      modelTestResults: [],
      modelTabError: null,
      isModelTesting: false
    };
  }

  async componentDidMount() {
    console.log('ComponentOpenRouterKeys: Initializing...');
    this.validateServices();
    this.initializeThemeService();
    await this.initializeSettingsDefinition();
    this.initializeSettingsSubscription();
    await this.loadApiKeyStatus();
  }

  async componentDidUpdate(
    prevProps: ComponentOpenRouterKeysProps,
    prevState: ComponentOpenRouterKeysState
  ) {
    if (this.props.services?.api !== prevProps.services?.api) {
      this.openRouterService = createOpenRouterService(this.props.services?.api);
    }

    if (this.state.savedApiKey !== prevState.savedApiKey) {
      clearModelCache();

      if (!this.state.savedApiKey) {
        this.setState({
          activeTab: 'api-key',
          modelsLoaded: false,
          availableModels: [],
          selectedModelId: null,
          modelTestResults: [],
          modelTabError: null
        });
      } else if (prevState.savedApiKey !== this.state.savedApiKey && this.state.activeTab === 'model-testing') {
        // API key changed while on model testing tab, refresh models.
        this.ensureModelsLoaded(true);
      }
    }
  }

  componentWillUnmount() {
    if (this.settingsUnsubscribe) {
      this.settingsUnsubscribe();
    }
    if (this.themeChangeListener && this.props.services?.theme) {
      this.props.services.theme.removeThemeChangeListener(this.themeChangeListener);
    }
  }

  /**
   * Initialize theme service
   */
  private initializeThemeService = () => {
    if (this.props.services?.theme) {
      try {
        const currentTheme = this.props.services.theme.getCurrentTheme();
        this.setState({ currentTheme });
        
        this.themeChangeListener = (newTheme: string) => {
          this.setState({ currentTheme: newTheme });
        };
        
        this.props.services.theme.addThemeChangeListener(this.themeChangeListener);
      } catch (error) {
        console.error('Error initializing theme service:', error);
      }
    }
  };

  /**
   * Initialize/register the settings definition in the frontend bridge
   * to ensure setSetting works even on first save.
   */
  private initializeSettingsDefinition = async () => {
    if (!this.props.services?.settings) {
      console.warn('ComponentOpenRouterKeys: Settings service not available for definition registration');
      return;
    }

    try {
      // If we can list definitions, check first
      if (this.props.services.settings.getSettingDefinitions) {
        try {
          const defs = await this.props.services.settings.getSettingDefinitions({ category: OPENROUTER_SETTINGS.CATEGORY });
          const exists = Array.isArray(defs) && defs.some((d: any) => d.id === OPENROUTER_SETTINGS.DEFINITION_ID);
          if (exists) {
            console.log('ComponentOpenRouterKeys: Setting definition already registered');
            return;
          }
        } catch (e) {
          console.warn('ComponentOpenRouterKeys: Could not query definitions, will attempt to register anyway');
        }
      }

      if (this.props.services.settings.registerSettingDefinition) {
        await this.props.services.settings.registerSettingDefinition({
          id: OPENROUTER_SETTINGS.DEFINITION_ID,
          name: 'OpenRouter API Keys Settings',
          description: 'Configure OpenRouter API key',
          category: OPENROUTER_SETTINGS.CATEGORY,
          type: 'object',
          default: OPENROUTER_SETTINGS.DEFAULT_VALUE,
          allowedScopes: ['user'],
          validation: {},
          isMultiple: false,
          tags: ['openrouter_api_keys_settings', 'OpenRouter', 'API Keys', 'AI Models', 'settings']
        });
        console.log('ComponentOpenRouterKeys: Registered settings definition');
      }
    } catch (error) {
      console.warn('ComponentOpenRouterKeys: Failed to register settings definition (non-fatal):', error);
    }
  };

  /**
   * Validate that required services are available
   */
  private validateServices(): void {
    if (!this.props.services?.settings) {
      // Don't block; we'll use API fallback if available
      console.warn('ComponentOpenRouterKeys: Settings service not available; will use API fallback if present');
      return;
    }

    if (typeof this.props.services.settings.getSetting !== 'function') {
      console.warn('ComponentOpenRouterKeys: getSetting not available; will use API fallback if present');
    }

    if (typeof this.props.services.settings.setSetting !== 'function') {
      console.warn('ComponentOpenRouterKeys: setSetting not available; will use API fallback if present');
    }

    console.log('ComponentOpenRouterKeys: Service validation checked');
  }

  /**
   * Initialize settings subscription for real-time updates (optional)
   */
  initializeSettingsSubscription() {
    if (!this.props.services?.settings?.subscribe) {
      console.log('ComponentOpenRouterKeys: Settings subscription not available (optional)');
      return;
    }

    // Subscribe to OpenRouter settings changes
    this.settingsUnsubscribe = this.props.services.settings.subscribe(
      OPENROUTER_SETTINGS.DEFINITION_ID,
      (value: any) => {
        console.log('OpenRouter settings updated:', value);
        if (value) {
          this.processApiKeyData(value);
        }
      }
    );
  }

  private loadApiKeyStatus = async () => {
    console.log('ComponentOpenRouterKeys: Loading settings...');
    this.setState({ isLoading: true, error: null });

    // Prefer API first to ensure we fetch the exact DB instance (and ID)
    if (this.props.services?.api?.get) {
      const loaded = await this.loadSettingsFromAPI();
      if (loaded) return;
    }

    // Settings service fallback
    if (this.props.services?.settings?.getSetting) {
      try {
        const value = await this.props.services.settings.getSetting(
          OPENROUTER_SETTINGS.DEFINITION_ID,
          { userId: 'current' }
        );
        console.log('ComponentOpenRouterKeys: Loaded settings value (settings service):', value);
        if (value) {
          this.processApiKeyData(value);
          return;
        }
      } catch (error: any) {
        console.warn('ComponentOpenRouterKeys: Error loading via settings service:', error?.message || error);
      }
    }

    // Final fallback to defaults
    console.log('ComponentOpenRouterKeys: No services available, using defaults');
    this.setState({
      isLoading: false,
      apiKey: '',
      savedApiKey: ''
    });
  };

  private processApiKeyData = (value: any) => {
    console.log('ComponentOpenRouterKeys: Processing API key data:', value);
    
    // Handle different data formats from settings service
    let apiKeyData = value;
    
    if (typeof value === 'string') {
      try {
        apiKeyData = JSON.parse(value);
      } catch (e) {
        // Treat as raw API key string if not JSON
        apiKeyData = { ...OPENROUTER_SETTINGS.DEFAULT_VALUE, apiKey: value };
      }
    }
    
    // Extract the API key
    const key = apiKeyData?.apiKey || '';
    
    console.log('ComponentOpenRouterKeys: Extracted API key:', key ? 'Key present (hidden)' : 'No key');
    
    this.setState({
      apiKey: key,
      savedApiKey: key,
      isLoading: false,
      error: null,
      testResult: null,
      testError: null,
      hasUnsavedChanges: false
    });
  };

  private handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    this.setState({ 
      apiKey: newKey,
      error: null,
      testResult: null,
      testError: null,
      hasUnsavedChanges: newKey !== this.state.savedApiKey
    });
  };

  private handleTabChange = (tab: 'api-key' | 'model-testing') => {
    if (tab === this.state.activeTab) {
      return;
    }

    if (tab === 'model-testing' && !this.state.savedApiKey) {
      this.setState({
        modelTabError: 'Save a valid OpenRouter API key to enable model testing.'
      });
      return;
    }

    this.setState({ activeTab: tab }, () => {
      if (tab === 'model-testing' && !this.state.modelsLoaded) {
        this.ensureModelsLoaded();
      }
    });
  };

  private handleTabsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();
    const { activeTab, savedApiKey } = this.state;
    const tabs: Array<'api-key' | 'model-testing'> = ['api-key', 'model-testing'];
    const currentIndex = tabs.indexOf(activeTab);
    const increment = event.key === 'ArrowRight' ? 1 : -1;
    let nextIndex = (currentIndex + increment + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];

    if (nextTab === 'model-testing' && !savedApiKey) {
      return;
    }

    this.handleTabChange(nextTab);
  };

  private handleModelSearchTermChange = (value: string) => {
    this.setState({ modelSearchTerm: value });
  };

  private handleModelSelect = (modelId: string) => {
    this.setState({ selectedModelId: modelId || null });
  };

  private handleClearTestHistory = () => {
    this.setState({ modelTestResults: [] });
  };

  private handleRefreshModels = () => {
    this.ensureModelsLoaded(true);
  };

  private ensureModelsLoaded = async (forceRefresh: boolean = false) => {
    if (this.state.modelsLoading) {
      return;
    }

    if (!this.state.savedApiKey) {
      this.setState({
        modelsLoaded: false,
        availableModels: [],
        modelTabError: 'Save a valid OpenRouter API key to load models.'
      });
      return;
    }

    this.setState({
      modelsLoading: true,
      modelTabError: null
    });

    try {
      const models = await this.openRouterService.fetchModels({ forceRefresh });
      this.setState((prevState) => {
        const currentSelectionStillExists = prevState.selectedModelId
          ? models.some((model) => model.id === prevState.selectedModelId)
          : false;

        return {
          availableModels: models,
          modelsLoaded: true,
          modelsLoading: false,
          modelTabError: null,
          selectedModelId: currentSelectionStillExists
            ? prevState.selectedModelId
            : models.length > 0
              ? models[0].id
              : null
        };
      });
    } catch (error: any) {
      const message = error?.message || 'Failed to load available models';
      this.setState({
        modelsLoading: false,
        modelTabError: message,
        modelsLoaded: false
      });
    }
  };

  private handleTestModel = async () => {
    const { selectedModelId, isModelTesting, availableModels } = this.state;

    if (!selectedModelId || isModelTesting) {
      return;
    }

    const selectedModel =
      availableModels.find((model) => model.id === selectedModelId) || null;

    if (!selectedModel) {
      this.setState({
        modelTabError: 'Select a model to test.',
        isModelTesting: false
      });
      return;
    }

    this.setState({
      isModelTesting: true,
      modelTabError: null
    });

    try {
      const result = await this.openRouterService.testModelAvailability(
        selectedModel.id,
        availableModels
      );

      this.setState((prevState) => ({
        modelTestResults: [result, ...prevState.modelTestResults].slice(0, 10),
        isModelTesting: false
      }));
    } catch (error: any) {
      const message = error?.message || 'Failed to verify model availability.';
      const fallbackResult: ModelTestResult = {
        id: `${selectedModel.id}-${Date.now()}`,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        status: 'unknown',
        timestamp: Date.now(),
        message: 'Could not confirm model availability.',
        details: message
      };

      this.setState((prevState) => ({
        modelTestResults: [fallbackResult, ...prevState.modelTestResults].slice(
          0,
          10
        ),
        isModelTesting: false,
        modelTabError: message
      }));
    }
  };

  private validateApiKey = (apiKey: string): { isValid: boolean; error?: string } => {
    if (apiKey && !apiKey.startsWith('sk-or-')) {
      return { isValid: false, error: 'API key must start with "sk-or-"' };
    }

    if (apiKey && apiKey.length < 26) {
      return { isValid: false, error: 'API key appears to be too short' };
    }

    return { isValid: true };
  };

  private saveApiKey = async () => {
    const { apiKey } = this.state;
    const previousSavedKey = this.state.savedApiKey;
    const keyChanged = apiKey !== previousSavedKey;
    const applyKeyReset = () => {
      if (!keyChanged) {
        return;
      }
      this.setState({
        modelsLoaded: false,
        availableModels: [],
        selectedModelId: null,
        modelTestResults: [],
        modelTabError: null
      });
    };

    if (apiKey) {
      const validation = this.validateApiKey(apiKey);
      if (!validation.isValid) {
        this.setState({ error: validation.error || 'Invalid API key' });
        return;
      }
    }

    this.setState({ isSaving: true, error: null, success: null });

    try {
      const settingValue = {
        ...OPENROUTER_SETTINGS.DEFAULT_VALUE,
        apiKey: apiKey.trim(),
        enabled: !!apiKey
      };

      // Prefer API save first to update the existing instance instead of creating duplicates
      if (this.props.services?.api?.post) {
        await this.saveSettingsToAPI(settingValue);
        this.setState(
          {
            success: apiKey ? 'API key saved successfully' : 'API key removed',
            savedApiKey: apiKey,
            isSaving: false,
            hasUnsavedChanges: false,
            testResult: null,
            testError: null
          },
          () => applyKeyReset()
        );
        setTimeout(() => this.setState({ success: null }), 3000);
        return;
      }

      // Fallback to Settings Service if API unavailable
      if (this.props.services?.settings?.setSetting) {
        await this.props.services.settings.setSetting(
          OPENROUTER_SETTINGS.DEFINITION_ID,
          settingValue,
          { userId: 'current' }
        );
        this.setState(
          {
            success: apiKey ? 'API key saved successfully' : 'API key removed',
            savedApiKey: apiKey,
            isSaving: false,
            hasUnsavedChanges: false,
            testResult: null,
            testError: null
          },
          () => applyKeyReset()
        );
        setTimeout(() => this.setState({ success: null }), 3000);
        return;
      }

      // If neither service is available
      throw new Error('No available service to save settings');
    } catch (error) {
      console.error('Error saving API key:', error);
      this.setState({
        error: 'Failed to save API key',
        isSaving: false,
        testResult: null,
        testError: null
      });
    }
  };

  private handleTestConnection = async () => {
    if (this.state.isTesting || this.state.isSaving) {
      return;
    }

    if (!this.props.services?.api?.get) {
      this.setState({
        testError: 'API service unavailable. Unable to call test endpoint.',
        testResult: null
      });
      return;
    }

    if (!this.state.savedApiKey) {
      this.setState({
        testError: 'Save a valid OpenRouter API key before testing the connection.',
        testResult: null
      });
      return;
    }

    if (this.state.hasUnsavedChanges) {
      this.setState({
        testError: 'Please save your changes before testing the connection.',
        testResult: null
      });
      return;
    }

    this.setState({
      isTesting: true,
      testError: null,
      testResult: null,
      success: null,
      error: null
    });

    try {
      const response = await this.props.services.api.get('/api/v1/ai/providers/models', {
        params: {
          provider: 'openrouter',
          settings_id: OPENROUTER_SETTINGS.DEFINITION_ID,
          server_id: 'openrouter_default_server',
          user_id: 'current'
        }
      });

      const rawModels = Array.isArray(response)
        ? response
        : (response?.models
          || response?.data?.models
          || []);

      const models = Array.isArray(rawModels) ? rawModels : [];
      const count = models.length;
      const preview = models.slice(0, 3).map((model: any) => model?.name || model?.id || 'unknown');
      const previewText = preview.length > 0
        ? ` (${preview.join(', ')}${count > preview.length ? '…' : ''})`
        : '';
      const message = `Connection successful • ${count} model${count === 1 ? '' : 's'} available${previewText}`;

      this.setState({ testResult: message });
      setTimeout(() => {
        this.setState(prev => prev.testResult === message ? { testResult: null } : null);
      }, 4000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to test connection';
      this.setState({
        testError: typeof detail === 'string' ? detail : 'Failed to test connection',
        testResult: null
      });
    } finally {
      this.setState({ isTesting: false });
    }
  };

  private clearApiKey = () => {
    this.setState({ 
      apiKey: '',
      testResult: null,
      testError: null,
      hasUnsavedChanges: this.state.savedApiKey !== ''
    });
  };

  /**
   * API fallback: Load settings directly from backend
   */
  private loadSettingsFromAPI = async () => {
    if (!this.props.services?.api?.get) {
      this.setState({ isLoading: false });
      return false;
    }

    try {
      // Try to find existing instance (try both 'user' and 'USER')
      const queryParamsBase = {
        definition_id: OPENROUTER_SETTINGS.DEFINITION_ID,
        user_id: 'current'
      } as any;

      const tryScopes = async (scopes: string[]) => {
        for (const s of scopes) {
          const resp = await this.props.services!.api!.get('/api/v1/settings/instances', {
            params: { ...queryParamsBase, scope: s }
          });
          if (Array.isArray(resp) && resp.length > 0) return resp;
          if (resp?.data) {
            const data = Array.isArray(resp.data) ? resp.data : [resp.data];
            if (data.length > 0) return data;
          }
        }
        return null;
      };

      const response = await tryScopes(['user', 'USER']);

      let instance: any = null;
      if (Array.isArray(response) && response.length > 0) {
        instance = response[0];
      }

      if (instance && (instance.value !== undefined)) {
        let parsed: any = instance.value;
        if (typeof instance.value === 'string') {
          try {
            parsed = JSON.parse(instance.value);
          } catch (e) {
            parsed = { ...OPENROUTER_SETTINGS.DEFAULT_VALUE, apiKey: instance.value };
          }
        }
        this.processApiKeyData(parsed);
        return true;
      } else {
        this.setState({ isLoading: false, apiKey: '', savedApiKey: '', testResult: null, testError: null });
        return false;
      }
    } catch (error: any) {
      console.warn('ComponentOpenRouterKeys: Error loading via API fallback:', error?.message || error);
      this.setState({ isLoading: false, apiKey: '', savedApiKey: '', testResult: null, testError: null });
      return false;
    }
  };

  /**
   * API fallback: Save settings directly to backend
   */
  private saveSettingsToAPI = async (value: any) => {
    if (!this.props.services?.api?.post) return;
    try {
      // First locate an existing instance (try both lowercase and uppercase scopes)
      let existingId: string | null = null;
      let existingScope: string | null = null;
      try {
        const findResp = await this.props.services!.api!.get('/api/v1/settings/instances', {
          params: {
            definition_id: OPENROUTER_SETTINGS.DEFINITION_ID,
            user_id: 'current',
            scope: 'user'
          }
        });
        let instance: any = null;
        if (Array.isArray(findResp) && findResp.length > 0) instance = findResp[0];
        else if (findResp?.data) instance = Array.isArray(findResp.data) ? findResp.data[0] : findResp.data;
        if (!instance) {
          const findRespUpper = await this.props.services!.api!.get('/api/v1/settings/instances', {
            params: {
              definition_id: OPENROUTER_SETTINGS.DEFINITION_ID,
              user_id: 'current',
              scope: 'USER'
            }
          });
          if (Array.isArray(findRespUpper) && findRespUpper.length > 0) instance = findRespUpper[0];
          else if (findRespUpper?.data) instance = Array.isArray(findRespUpper.data) ? findRespUpper.data[0] : findRespUpper.data;
        }
        if (instance && instance.id) {
          existingId = instance.id;
          existingScope = instance.scope || 'user';
        }
      } catch (findErr) {
        console.warn('ComponentOpenRouterKeys: Could not query existing instance before save:', findErr);
      }

      const payload: any = {
        definition_id: OPENROUTER_SETTINGS.DEFINITION_ID,
        name: 'OpenRouter API Keys Settings',
        value,
        scope: existingScope || 'user',
        user_id: 'current'
      };
      if (existingId) payload.id = existingId;

      await this.props.services.api.post('/api/v1/settings/instances', payload);
    } catch (error) {
      console.error('ComponentOpenRouterKeys: Error saving via API fallback:', error);
      throw error;
    }
  };

  private handleTooltipShow = () => {
    if (this.infoIconRef.current) {
      const rect = this.infoIconRef.current.getBoundingClientRect();
      this.setState({
        showTooltip: true,
        tooltipPosition: {
          top: rect.bottom + 8,
          left: rect.left
        }
      });
    }
  };

  private handleTooltipHide = () => {
    this.setState({
      showTooltip: false,
      tooltipPosition: null
    });
  };

  private renderApiKeyTab() {
    const {
      apiKey,
      savedApiKey,
      error,
      success,
      testResult,
      testError,
      isKeyVisible,
      isSaving,
      isTesting,
      showTooltip,
      hasUnsavedChanges,
      tooltipPosition
    } = this.state;

    const canTestConnection = !!this.props.services?.api?.get;
    const combinedError = error || testError;
    const combinedSuccess = testResult || success;

    return (
      <>
        <div className="openrouter-setting-card">
          <div className="openrouter-card-content">
            <div className="openrouter-card-left">
              <div className="openrouter-card-icon">
                <KeyIcon />
              </div>
              <div className="openrouter-card-text">
                <div className="openrouter-card-title">
                  <span>OpenRouter API Key</span>
                  <div
                    ref={this.infoIconRef}
                    className="openrouter-info-icon"
                    onMouseEnter={this.handleTooltipShow}
                    onMouseLeave={this.handleTooltipHide}
                  >
                    <InfoIcon />
                  </div>
                  {showTooltip && tooltipPosition && (
                    <div
                      className="openrouter-tooltip"
                      style={{
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`
                      }}
                    >
                      <div className="openrouter-tooltip-content">
                        <strong>How to get an API key</strong>
                        {`Visit OpenRouter.ai
Sign up or log in to your account
Navigate to the API Keys section
Create a new API key
Copy the key and paste it here`}
                      </div>
                    </div>
                  )}
                </div>
                <div className="openrouter-card-description">
                  Configure your API key to access AI models
                </div>
              </div>
            </div>

            <div className="openrouter-card-right">
              <div className="openrouter-input-group">
                <input
                  type={isKeyVisible ? 'text' : 'password'}
                  value={apiKey}
                  onChange={this.handleApiKeyChange}
                  placeholder="sk-or-..."
                  className="openrouter-input"
                  disabled={isSaving}
                />
                
                <button
                  type="button"
                  className="openrouter-icon-btn"
                  onClick={() => this.setState({ isKeyVisible: !isKeyVisible })}
                  disabled={isSaving}
                  aria-label={isKeyVisible ? 'Hide API key' : 'Show API key'}
                >
                  {isKeyVisible ? <EyeOffIcon /> : <EyeIcon />}
                </button>

                {apiKey && (
                  <button
                    type="button"
                    className="openrouter-icon-btn"
                    onClick={this.clearApiKey}
                    disabled={isSaving}
                    aria-label="Clear API key"
                  >
                    <ClearIcon />
                  </button>
                )}

                <button
                  type="button"
                  className="openrouter-icon-btn"
                  onClick={this.handleTestConnection}
                  disabled={isSaving || isTesting || !savedApiKey || !canTestConnection}
                  aria-label="Test OpenRouter connection"
                >
                  {isTesting ? (
                    <div className="openrouter-mini-spinner"></div>
                  ) : (
                    <TestConnectionIcon />
                  )}
                </button>

                <button
                  type="button"
                  className={`openrouter-icon-btn openrouter-save-btn ${hasUnsavedChanges ? 'has-changes' : ''}`}
                  onClick={this.saveApiKey}
                  disabled={isSaving || !hasUnsavedChanges}
                  aria-label="Save API key"
                >
                  {isSaving ? (
                    <div className="openrouter-mini-spinner"></div>
                  ) : (
                    <SaveIcon />
                  )}
                </button>
              </div>

              {savedApiKey && !hasUnsavedChanges && (
                <div className="openrouter-status">
                  <CheckIcon />
                  <span>Active</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {combinedError && (
          <div className="openrouter-alert error">
            <span>{combinedError}</span>
          </div>
        )}

        {combinedSuccess && (
          <div className="openrouter-alert success">
            <CheckIcon />
            <span>{combinedSuccess}</span>
          </div>
        )}
      </>
    );
  }

  private renderModelTestingTab() {
    const {
      availableModels,
      modelSearchTerm,
      modelsLoading,
      selectedModelId,
      modelTestResults,
      modelTabError,
      isModelTesting,
      savedApiKey
    } = this.state;

    const normalizedSearch = modelSearchTerm.trim().toLowerCase();
    const filteredModels = normalizedSearch
      ? availableModels.filter((model) => {
          const haystack = [
            model.name,
            model.id,
            model.provider,
            model.ownedBy,
            model.description
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalizedSearch);
        })
      : availableModels;

    const selectedModel =
      availableModels.find((model) => model.id === selectedModelId) || null;

    const isTestingDisabled = !savedApiKey || !availableModels.length || modelsLoading;

    return (
      <div className="openrouter-model-testing-tab">
        <div className="openrouter-model-testing-header">
          <div>
            <h3>Model Testing</h3>
            <p>
              Validate OpenRouter model availability without sending billable
              inference requests.
            </p>
          </div>
          <div className="openrouter-model-testing-actions">
            <button
              type="button"
              className="openrouter-refresh-button"
              onClick={this.handleRefreshModels}
              disabled={modelsLoading || !savedApiKey}
            >
              {modelsLoading ? 'Refreshing…' : 'Refresh models'}
            </button>
          </div>
        </div>

        {!savedApiKey && (
          <div className="openrouter-alert info">
            Save a valid OpenRouter API key in the first tab to enable model
            testing.
          </div>
        )}

        <ModelSelector
          models={filteredModels}
          selectedModel={selectedModelId}
          searchTerm={modelSearchTerm}
          onSearchTermChange={this.handleModelSearchTermChange}
          onModelSelect={this.handleModelSelect}
          isLoading={modelsLoading}
          disabled={!savedApiKey}
        />

        {modelTabError && (
          <div className="openrouter-alert error">
            <span>{modelTabError}</span>
          </div>
        )}

        <ModelTester
          selectedModel={selectedModel}
          onTestModel={this.handleTestModel}
          isTesting={isModelTesting}
          disabled={isTestingDisabled}
        />

        <TestResults
          results={modelTestResults}
          onClearHistory={this.handleClearTestHistory}
        />
      </div>
    );
  }

  render() {
    const { isLoading, currentTheme, activeTab, savedApiKey } = this.state;

    const containerClassName = `openrouter-container ${currentTheme}-theme`;

    if (isLoading) {
      return (
        <div className={containerClassName}>
          <div className="openrouter-loading">
            <div className="openrouter-spinner"></div>
            <span>Loading settings...</span>
          </div>
        </div>
      );
    }

    return (
      <div className={containerClassName}>
        <div
          className="openrouter-tabs"
          role="tablist"
          aria-label="OpenRouter plugin navigation"
          onKeyDown={this.handleTabsKeyDown}
        >
          <button
            type="button"
            role="tab"
            id="openrouter-api-key-tab"
            aria-controls="openrouter-api-key-panel"
            aria-selected={activeTab === 'api-key'}
            className={`openrouter-tab ${activeTab === 'api-key' ? 'active' : ''}`}
            onClick={() => this.handleTabChange('api-key')}
          >
            API Key Setup
          </button>
          <button
            type="button"
            role="tab"
            id="openrouter-model-testing-tab"
            aria-controls="openrouter-model-testing-panel"
            aria-selected={activeTab === 'model-testing'}
            aria-disabled={!savedApiKey}
            className={`openrouter-tab ${activeTab === 'model-testing' ? 'active' : ''}`}
            onClick={() => this.handleTabChange('model-testing')}
            disabled={!savedApiKey}
          >
            Model Testing
          </button>
        </div>
        <div className="openrouter-tab-content">
          <div
            role="tabpanel"
            id="openrouter-api-key-panel"
            aria-labelledby="openrouter-api-key-tab"
            hidden={activeTab !== 'api-key'}
          >
            {this.renderApiKeyTab()}
          </div>
          <div
            role="tabpanel"
            id="openrouter-model-testing-panel"
            aria-labelledby="openrouter-model-testing-tab"
            hidden={activeTab !== 'model-testing'}
          >
            {this.renderModelTestingTab()}
          </div>
        </div>
      </div>
    );
  }
}

export default ComponentOpenRouterKeys;
