import React from 'react';
import './ComponentOpenRouterKeys.css';
import { KeyIcon, EyeIcon, EyeOffIcon, SaveIcon, InfoIcon, CheckIcon, ClearIcon } from './icons';

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
  isKeyVisible: boolean;
  isSaving: boolean;
  currentTheme: string;
  showTooltip: boolean;
  hasUnsavedChanges: boolean;
  tooltipPosition: { top: number; left: number } | null;
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
  private settingsUnsubscribe?: () => void;
  private themeChangeListener: ((theme: string) => void) | null = null;
  private infoIconRef = React.createRef<HTMLDivElement>();

  constructor(props: ComponentOpenRouterKeysProps) {
    super(props);
    this.state = {
      apiKey: '',
      savedApiKey: '',
      isLoading: true,
      error: null,
      success: null,
      isKeyVisible: false,
      isSaving: false,
      currentTheme: 'dark',
      showTooltip: false,
      hasUnsavedChanges: false,
      tooltipPosition: null
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
      hasUnsavedChanges: false
    });
  };

  private handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    this.setState({ 
      apiKey: newKey,
      error: null,
      hasUnsavedChanges: newKey !== this.state.savedApiKey
    });
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
        this.setState({
          success: apiKey ? 'API key saved successfully' : 'API key removed',
          savedApiKey: apiKey,
          isSaving: false,
          hasUnsavedChanges: false
        });
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
        this.setState({
          success: apiKey ? 'API key saved successfully' : 'API key removed',
          savedApiKey: apiKey,
          isSaving: false,
          hasUnsavedChanges: false
        });
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
      });
    }
  };

  private clearApiKey = () => {
    this.setState({ 
      apiKey: '',
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
        this.setState({ isLoading: false, apiKey: '', savedApiKey: '' });
        return false;
      }
    } catch (error: any) {
      console.warn('ComponentOpenRouterKeys: Error loading via API fallback:', error?.message || error);
      this.setState({ isLoading: false, apiKey: '', savedApiKey: '' });
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

  render() {
    const {
      apiKey,
      savedApiKey,
      isLoading,
      error,
      success,
      isKeyVisible,
      isSaving,
      currentTheme,
      showTooltip,
      hasUnsavedChanges,
      tooltipPosition
    } = this.state;

    if (isLoading) {
      return (
        <div className={`openrouter-container ${currentTheme}-theme`}>
          <div className="openrouter-loading">
            <div className="openrouter-spinner"></div>
            <span>Loading settings...</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`openrouter-container ${currentTheme}-theme`}>
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

        {error && (
          <div className="openrouter-alert error">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="openrouter-alert success">
            <CheckIcon />
            <span>{success}</span>
          </div>
        )}
      </div>
    );
  }
}

export default ComponentOpenRouterKeys;
