import React from "react";
import ComponentOpenRouterKeys from "./ComponentOpenRouterKeys";
import { Services } from "./types";

// Export the main component
export default ComponentOpenRouterKeys;

// Export types for external use
export type {
	ComponentOpenRouterKeysProps,
	ComponentOpenRouterKeysState,
	Services,
	OpenRouterConfig,
	OpenRouterApiKeyData,
	OpenRouterSettingsInstance,
	OpenRouterModel,
	OpenRouterProvider,
	ErrorInfo,
} from "./types";

// Export error handling utilities
export {
	ErrorHandler,
	PluginError,
	ServiceError,
	ValidationError,
	ErrorStrategy,
	ErrorSeverity,
	ErrorUtils,
} from "./utils/errorHandling";

// Export error boundary components
export { default as ErrorBoundary } from "./components/ErrorBoundary";
export { default as ErrorDisplay } from "./components/ErrorDisplay";

// Plugin metadata for BrainDrive
export const pluginMetadata = {
	name: "ComponentOpenRouterKeys",
	displayName: "OpenRouter API Keys",
	description:
		"Configure OpenRouter API key for accessing various AI models from multiple providers",
	version: "1.0.0",
	author: "BrainDrive Team",
	category: "AI Settings",
	icon: "Key",
	tags: ["openrouter", "api", "keys", "ai", "settings"],
	dependencies: [],
	permissions: ["settings.read", "settings.write", "api.access"],
};

// Default export for module federation
const OpenRouterPlugin = {
	ComponentOpenRouterKeys,
	pluginMetadata,
	// Factory function for creating component instances
	createComponent: (props: any) =>
		React.createElement(ComponentOpenRouterKeys, props),
};

export { OpenRouterPlugin };
