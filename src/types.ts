// OpenRouter API Keys Component - Core type definitions for BrainDrive plugins

// Service interfaces - these match the BrainDrive service contracts
export interface ApiService {
	get: (url: string, options?: any) => Promise<ApiResponse>;
	post: (url: string, data: any, options?: any) => Promise<ApiResponse>;
	put: (url: string, data: any, options?: any) => Promise<ApiResponse>;
	delete: (url: string, options?: any) => Promise<ApiResponse>;
	postStreaming?: (
		url: string,
		data: any,
		onChunk: (chunk: string) => void,
		options?: any
	) => Promise<ApiResponse>;
}

export interface EventService {
	sendMessage: (target: string, message: any, options?: any) => void;
	subscribeToMessages: (
		target: string,
		callback: (message: any) => void
	) => void;
	unsubscribeFromMessages: (
		target: string,
		callback: (message: any) => void
	) => void;
}

export interface ThemeService {
	getCurrentTheme: () => string;
	setTheme: (theme: string) => void;
	toggleTheme: () => void;
	addThemeChangeListener: (callback: (theme: string) => void) => void;
	removeThemeChangeListener: (callback: (theme: string) => void) => void;
}

export interface SettingsService {
	get: (key: string) => any;
	set: (key: string, value: any) => Promise<void>;
	getSetting?: (id: string) => Promise<any>;
	setSetting?: (id: string, value: any) => Promise<any>;
	getSettingDefinitions?: () => Promise<any>;
}

export interface PageContextService {
	getCurrentPageContext(): {
		pageId: string;
		pageName: string;
		pageRoute: string;
		isStudioPage: boolean;
	} | null;
	onPageContextChange(callback: (context: any) => void): () => void;
}

// Services container
export interface Services {
	api?: ApiService;
	event?: EventService;
	theme?: ThemeService;
	settings?: SettingsService;
	pageContext?: PageContextService;
}

// API Response interface
export interface ApiResponse {
	data?: any;
	status?: number;
	id?: string;
	[key: string]: any;
}

// OpenRouter API Keys Component specific types
export interface ComponentOpenRouterKeysProps {
	moduleId?: string;
	pluginId?: string;
	instanceId?: string;
	services: Services;
	title?: string;
	description?: string;
	config?: OpenRouterConfig;
}

export interface ComponentOpenRouterKeysState {
	// API Key management
	apiKey: string;
	hasApiKey: boolean;
	keyValid: boolean;
	maskedKey: string | null;
	lastUpdated: string | null;
	settingId: string | null;
	currentUserId: string | null;

	// UI state
	isLoading: boolean;
	isKeyVisible: boolean;
	isRemoving: boolean;
	showRemoveConfirm: boolean;

	// Error handling
	error: string;
	success: string | null;
	lastError: ErrorInfo | null;
	retryAvailable: boolean;

	// Theme
	currentTheme: string;

	// Initialization
	isInitializing: boolean;
}

// OpenRouter configuration interface
export interface OpenRouterConfig {
	refreshInterval?: number;
	showAdvancedOptions?: boolean;
	enableKeyValidation?: boolean;
	customSetting?: string;
}

// OpenRouter API key data interface
export interface OpenRouterApiKeyData {
	api_key: string;
	_has_key?: boolean;
	_key_valid?: boolean;
}

// OpenRouter settings instance interface
export interface OpenRouterSettingsInstance {
	id: string;
	name: string;
	definition_id: string;
	scope: string;
	user_id: string;
	value: string;
	created_at: string;
	updated_at: string;
}

// OpenRouter model information interface
export interface OpenRouterModel {
	id: string;
	name: string;
	provider: string;
	description?: string;
	context_length?: number;
	pricing?: {
		prompt: string;
		completion: string;
	};
}

// OpenRouter provider information interface
export interface OpenRouterProvider {
	id: string;
	name: string;
	description?: string;
	models: OpenRouterModel[];
}

// Error information interface
export interface ErrorInfo {
	message: string;
	code?: string;
	details?: any;
	timestamp: string;
	stack?: string;
}
