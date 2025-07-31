import React from "react";
import "./ComponentOpenRouterKeys.css";
import {
	ComponentOpenRouterKeysProps,
	ComponentOpenRouterKeysState,
	Services,
	ErrorInfo,
} from "./types";
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorDisplay from "./components/ErrorDisplay";
import {
	ErrorHandler,
	PluginError,
	ServiceError,
	ValidationError,
	ErrorStrategy,
	ErrorSeverity,
	ErrorUtils,
} from "./utils/errorHandling";

// Key icon component
const KeyIcon: React.FC = () => (
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
	</svg>
);

/**
 * ComponentOpenRouterKeys - A component that allows users to configure their OpenRouter API key
 * for accessing various AI models from multiple providers through OpenRouter.
 */
class ComponentOpenRouterKeys extends React.Component<
	ComponentOpenRouterKeysProps,
	ComponentOpenRouterKeysState
> {
	private themeChangeListener: ((theme: string) => void) | null = null;
	private errorHandler: ErrorHandler;
	private retryCount: number = 0;
	private maxRetries: number = 3;

	constructor(props: ComponentOpenRouterKeysProps) {
		super(props);

		// Initialize error handler with plugin context
		this.errorHandler = new ErrorHandler(
			{
				maxRetries: this.maxRetries,
				retryDelay: 1000,
				enableLogging: true,
				enableReporting: true,
				userNotification: true,
				fallbackValues: {
					plugindata: null,
					theme: "light",
					settings: {},
				},
			},
			{
				component: "ComponentOpenRouterKeys",
				pluginId: props.pluginId || "BrainDriveOpenRouter",
				moduleId: props.moduleId || "ComponentOpenRouterKeys",
			}
		);

		// Initialize component state
		this.state = {
			apiKey: "",
			isLoading: true,
			error: "",
			success: null,
			currentTheme: "light",
			isKeyVisible: false,
			isRemoving: false,
			showRemoveConfirm: false,
			hasApiKey: false,
			keyValid: false,
			maskedKey: null,
			lastUpdated: null,
			settingId: null,
			currentUserId: null,
			isInitializing: true,
			lastError: null,
			retryAvailable: false,
		};

		// Bind error handling methods
		this.handleRetry = this.handleRetry.bind(this);
		this.handleDismissError = this.handleDismissError.bind(this);
	}

	async componentDidMount() {
		await this.errorHandler
			.safeAsync(
				async () => {
					await this.initializeServices();
					await this.loadInitialData();
					this.setState({
						isInitializing: false,
						error: "",
						lastError: null,
						retryAvailable: false,
					});
				},
				undefined,
				ErrorStrategy.RETRY
			)
			.catch((error) => {
				this.handleComponentError(error, "componentDidMount");
			});
	}

	componentWillUnmount() {
		this.cleanupServices();
	}

	private handleComponentError = (error: unknown, context: string) => {
		const normalizedError = ErrorUtils.normalizeError(error);
		const errorInfo: ErrorInfo = {
			message: ErrorUtils.getUserMessage(normalizedError),
			code:
				normalizedError instanceof PluginError
					? normalizedError.code
					: undefined,
			details:
				normalizedError instanceof PluginError
					? normalizedError.details
					: undefined,
			timestamp: new Date().toISOString(),
			stack: normalizedError.stack,
		};

		this.setState({
			error: errorInfo.message,
			lastError: errorInfo,
			retryAvailable: this.retryCount < this.maxRetries,
			isLoading: false,
			isInitializing: false,
		});
	};

	private handleRetry = async () => {
		this.retryCount++;
		this.setState({
			error: "",
			retryAvailable: false,
			isLoading: true,
		});

		try {
			await this.loadInitialData();
			this.setState({
				isLoading: false,
				lastError: null,
			});
		} catch (error) {
			this.handleComponentError(error, "retry");
		}
	};

	private handleDismissError = () => {
		this.setState({
			error: "",
			lastError: null,
			retryAvailable: false,
		});
	};

	private async initializeServices(): Promise<void> {
		try {
			// Initialize theme service
			if (this.props.services?.theme) {
				const theme = this.props.services.theme.getCurrentTheme();
				this.setState({ currentTheme: theme });

				// Subscribe to theme changes
				this.themeChangeListener = (newTheme: string) => {
					this.setState({ currentTheme: newTheme });
				};

				this.props.services.theme.addThemeChangeListener(
					this.themeChangeListener
				);
			}

			// Get current user ID
			await this.getCurrentUserId();
		} catch (error) {
			throw new ServiceError(
				"Failed to initialize services",
				"services",
				"INIT_ERROR",
				error
			);
		}
	}

	private cleanupServices(): void {
		if (this.themeChangeListener && this.props.services?.theme) {
			this.props.services.theme.removeThemeChangeListener(
				this.themeChangeListener
			);
		}
	}

	private async loadInitialData(): Promise<void> {
		if (this.state.currentUserId) {
			await this.loadKeyStatus();
		}
	}

	/**
	 * Get the current user ID from the API
	 */
	async getCurrentUserId() {
		try {
			if (this.props.services?.api) {
				const response = await this.props.services.api.get("/api/v1/auth/me");
				if (response && response.id) {
					this.setState({ currentUserId: response.id }, () => {
						// Load key status after getting user ID
						this.loadKeyStatus();
					});
				} else {
					this.setState({
						error: "Failed to get current user ID",
						isLoading: false,
					});
				}
			} else {
				this.setState({
					error: "API service not available",
					isLoading: false,
				});
			}
		} catch (error) {
			console.error("Error getting current user ID:", error);
			this.setState({
				error: "Failed to get current user ID",
				isLoading: false,
			});
		}
	}

	/**
	 * Load OpenRouter API key status from the existing settings endpoint
	 * The backend now masks sensitive data before sending to frontend
	 */
	async loadKeyStatus() {
		if (!this.props.services?.api || !this.state.currentUserId) {
			this.setState({
				error: "API service or user ID not available",
				isLoading: false,
			});
			return;
		}

		try {
			const response = await this.props.services.api.get(
				"/api/v1/settings/instances",
				{
					params: {
						definition_id: "openrouter_api_keys_settings",
						scope: "user",
						user_id: this.state.currentUserId,
					},
				}
			);

			let instance = null;

			if (Array.isArray(response) && response.length > 0) {
				instance = response[0];
			} else if (
				response &&
				typeof response === "object" &&
				"data" in response
			) {
				const data = Array.isArray(response.data)
					? response.data[0]
					: response.data;
				instance = data;
			} else if (response) {
				instance = response;
			}

			if (instance) {
				// Parse the value if it's a string
				const value =
					typeof instance.value === "string"
						? JSON.parse(instance.value)
						: instance.value;

				// Extract information from the masked data
				const apiKey = value?.api_key || "";
				const hasApiKey = value?._has_key || false;
				const keyValid = value?._key_valid || false;

				this.setState({
					hasApiKey,
					keyValid,
					maskedKey: apiKey || null,
					lastUpdated: instance.updated_at || null,
					settingId: instance.id,
					isLoading: false,
				});
			} else {
				this.setState({ isLoading: false });
			}
		} catch (error) {
			console.error("Error loading OpenRouter API key status:", error);
			this.setState({
				error: this.getErrorMessage(error),
				isLoading: false,
			});
		}
	}

	/**
	 * Validate OpenRouter API key format
	 */
	validateApiKey(apiKey: string): { isValid: boolean; error?: string } {
		if (!apiKey.trim()) {
			return { isValid: false, error: "API key cannot be empty" };
		}

		// Check if it starts with sk-or-
		if (!apiKey.startsWith("sk-or-")) {
			return { isValid: false, error: "API key must start with 'sk-or-'" };
		}

		// Check minimum length (sk-or- + at least 20 characters)
		if (apiKey.length < 26) {
			return { isValid: false, error: "API key appears to be too short" };
		}

		// Check for common patterns
		if (
			apiKey.includes(" ") ||
			apiKey.includes("\n") ||
			apiKey.includes("\t")
		) {
			return { isValid: false, error: "API key contains invalid characters" };
		}

		return { isValid: true };
	}

	/**
	 * Save OpenRouter API key using the existing settings endpoint
	 * The backend will handle encryption and storage
	 */
	async saveSettings(apiKey: string) {
		if (!this.props.services?.api || !this.state.currentUserId) {
			this.setState({ error: "API service or user ID not available" });
			return;
		}

		// Validate API key
		const validation = this.validateApiKey(apiKey);
		if (!validation.isValid) {
			this.setState({ error: validation.error || "Invalid API key" });
			return;
		}

		try {
			this.setState({ isLoading: true, error: "", success: null });

			const settingValue = {
				api_key: apiKey,
			};

			const settingData: any = {
				definition_id: "openrouter_api_keys_settings",
				name: "OpenRouter API Keys",
				value: JSON.stringify(settingValue),
				scope: "user",
				user_id: this.state.currentUserId,
			};

			if (this.state.settingId) {
				// Update existing setting - include the ID in the payload
				settingData.id = this.state.settingId;
			}

			// Use the existing settings endpoint
			const response = await this.props.services.api.post(
				"/api/v1/settings/instances",
				settingData
			);

			if (response?.id) {
				this.setState({ settingId: response.id });
			}

			this.setState({
				success: "OpenRouter API key saved successfully!",
				isLoading: false,
				apiKey: "", // Clear the input field for security
			});

			// Refresh the status to get updated masked key
			await this.loadKeyStatus();

			// Clear success message after 3 seconds
			setTimeout(() => {
				this.setState({ success: null });
			}, 3000);
		} catch (error) {
			console.error("Error saving OpenRouter API key settings:", error);
			this.setState({
				error: this.getErrorMessage(error),
				isLoading: false,
			});
		}
	}

	/**
	 * Remove OpenRouter API key using the existing settings endpoint
	 */
	async removeApiKey() {
		if (!this.props.services?.api || !this.state.currentUserId) {
			this.setState({ error: "API service or user ID not available" });
			return;
		}

		try {
			this.setState({ isRemoving: true, error: "", success: null });

			const settingValue = {
				api_key: "",
			};

			const settingData: any = {
				definition_id: "openrouter_api_keys_settings",
				name: "OpenRouter API Keys",
				value: JSON.stringify(settingValue),
				scope: "user",
				user_id: this.state.currentUserId,
			};

			if (this.state.settingId) {
				// Update existing setting - include the ID in the payload
				settingData.id = this.state.settingId;
			}

			// Use the existing settings endpoint
			const response = await this.props.services.api.post(
				"/api/v1/settings/instances",
				settingData
			);

			if (response?.id) {
				this.setState({ settingId: response.id });
			}

			this.setState({
				success: "OpenRouter API key removed successfully!",
				isRemoving: false,
				showRemoveConfirm: false,
				hasApiKey: false,
				keyValid: false,
				maskedKey: null,
				lastUpdated: null,
			});

			// Clear success message after 3 seconds
			setTimeout(() => {
				this.setState({ success: null });
			}, 3000);
		} catch (error) {
			console.error("Error removing OpenRouter API key settings:", error);
			this.setState({
				error: this.getErrorMessage(error),
				isRemoving: false,
			});
		}
	}

	/**
	 * Handle API key input change
	 */
	handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		this.setState({ apiKey: e.target.value, error: "" });
	};

	/**
	 * Handle save button click
	 */
	handleSave = () => {
		this.saveSettings(this.state.apiKey);
	};

	/**
	 * Handle remove button click
	 */
	handleRemove = () => {
		this.setState({ showRemoveConfirm: true });
	};

	/**
	 * Handle remove confirmation
	 */
	handleRemoveConfirm = () => {
		this.removeApiKey();
	};

	/**
	 * Handle remove cancellation
	 */
	handleRemoveCancel = () => {
		this.setState({ showRemoveConfirm: false });
	};

	/**
	 * Toggle API key visibility (only for input field, not stored key)
	 */
	toggleKeyVisibility = () => {
		this.setState((prevState) => ({ isKeyVisible: !prevState.isKeyVisible }));
	};

	/**
	 * Get error message from error object
	 */
	getErrorMessage(error: any): string {
		if (error?.response?.data?.detail) {
			return error.response.data.detail;
		} else if (error?.message) {
			return error.message;
		} else if (typeof error === "string") {
			return error;
		} else {
			return "An unknown error occurred";
		}
	}

	private renderLoading(): JSX.Element {
		return (
			<div className="loading-overlay">
				<div className="spinner"></div>
				<span>Loading OpenRouter settings...</span>
			</div>
		);
	}

	private renderError(): JSX.Element {
		return (
			<ErrorDisplay
				error={this.state.lastError || this.state.error}
				onRetry={this.handleRetry}
				onDismiss={this.handleDismissError}
				showDetails={true}
			/>
		);
	}

	private renderContent(): JSX.Element {
		const {
			apiKey,
			isLoading,
			error,
			success,
			currentTheme,
			isKeyVisible,
			isRemoving,
			showRemoveConfirm,
			hasApiKey,
			keyValid,
			maskedKey,
			lastUpdated,
		} = this.state;
		const isDarkTheme = currentTheme === "dark";

		return (
			<div
				className={`openrouter-keys-container ${
					isDarkTheme ? "dark" : "light"
				}`}
			>
				<div className="openrouter-keys-header">
					<div className="openrouter-keys-title">
						<KeyIcon />
						<h3>OpenRouter API Keys</h3>
					</div>
					<p className="openrouter-keys-description">
						Configure your OpenRouter API key to access various AI models from
						multiple providers like OpenAI, Anthropic, Google, and more. Your
						API key is encrypted and stored securely.
					</p>
				</div>

				<div className="openrouter-keys-content">
					{hasApiKey ? (
						<div className="api-key-section">
							<label className="api-key-label">Current API Key</label>
							<div className="api-key-display">
								<span className="masked-key">{maskedKey || "sk-or-..."}</span>
								<span className={`key-status ${keyValid ? "" : "invalid"}`}>
									{keyValid ? "✅ Valid" : "⚠️ Invalid"}
								</span>
							</div>
							{lastUpdated && (
								<p className="api-key-help">
									Last updated: {new Date(lastUpdated).toLocaleString()}
								</p>
							)}
						</div>
					) : (
						<div className="api-key-section">
							<label htmlFor="openrouter-api-key" className="api-key-label">
								OpenRouter API Key
							</label>
							<div className="api-key-input-container">
								<input
									id="openrouter-api-key"
									type={isKeyVisible ? "text" : "password"}
									value={apiKey}
									onChange={this.handleApiKeyChange}
									placeholder="sk-or-..."
									className="api-key-input"
									disabled={isLoading}
								/>
								<button
									type="button"
									onClick={this.toggleKeyVisibility}
									className="visibility-toggle"
									disabled={isLoading}
								>
									{isKeyVisible ? "👁️" : "👁️‍🗨️"}
								</button>
							</div>
							<p className="api-key-help">
								Get your API key from{" "}
								<a
									href="https://openrouter.ai/keys"
									target="_blank"
									rel="noopener noreferrer"
									className="api-key-link"
								>
									OpenRouter Platform (https://openrouter.ai/keys)
								</a>
							</p>
						</div>
					)}

					{error && <div className="error-message">{error}</div>}

					{success && <div className="success-message">{success}</div>}

					<div className="openrouter-keys-actions">
						{hasApiKey ? (
							<>
								<button
									onClick={this.handleSave}
									disabled={isLoading}
									className="save-button"
								>
									{isLoading ? "Saving..." : "Update API Key"}
								</button>
								<button
									onClick={this.handleRemove}
									disabled={isLoading || isRemoving}
									className="remove-button"
								>
									{isRemoving ? "Removing..." : "Remove API Key"}
								</button>
							</>
						) : (
							<button
								onClick={this.handleSave}
								disabled={isLoading}
								className="save-button"
							>
								{isLoading ? "Saving..." : "Save API Key"}
							</button>
						)}
					</div>

					{showRemoveConfirm && (
						<div className="remove-confirmation">
							<div className="confirmation-content">
								<h4>Remove API Key?</h4>
								<p>
									Are you sure you want to remove your OpenRouter API key? This
									action cannot be undone.
								</p>
								<div className="confirmation-actions">
									<button
										onClick={this.handleRemoveConfirm}
										disabled={isRemoving}
										className="confirm-button"
									>
										{isRemoving ? "Removing..." : "Yes, Remove"}
									</button>
									<button
										onClick={this.handleRemoveCancel}
										disabled={isRemoving}
										className="cancel-button"
									>
										Cancel
									</button>
								</div>
							</div>
						</div>
					)}

					<div className="openrouter-keys-info">
						<h4>How it works:</h4>
						<ul>
							<li>Enter your OpenRouter API key above</li>
							<li>
								Once saved, you'll be able to access models from multiple
								providers
							</li>
							<li>
								Your API key is encrypted and stored securely on the server
							</li>
							<li>
								You can use models from OpenAI, Anthropic, Google, Meta, and
								more
							</li>
							<li>You can remove your API key at any time for security</li>
						</ul>

						<h4>Available Models:</h4>
						<ul>
							<li>🤖 OpenAI: GPT-4, GPT-4o, GPT-3.5-turbo</li>
							<li>🧠 Anthropic: Claude 3.5 Sonnet, Claude 3 Haiku</li>
							<li>🔍 Google: Gemini Pro, Gemini Flash</li>
							<li>📱 Meta: Llama 3.1, Code Llama</li>
							<li>🚀 And many more from various providers</li>
						</ul>

						<h4>Security Features:</h4>
						<ul>
							<li>✅ API key format validation</li>
							<li>✅ Secure backend storage with encryption</li>
							<li>✅ Keys masked before sending to frontend</li>
							<li>✅ Masked display only</li>
							<li>✅ Easy key removal functionality</li>
							<li>✅ User-scoped access control</li>
						</ul>
					</div>
				</div>
			</div>
		);
	}

	render(): JSX.Element {
		return (
			<ErrorBoundary
				fallback={
					<ErrorDisplay
						error={
							new PluginError("Component crashed", "ComponentOpenRouterKeys")
						}
					/>
				}
			>
				{this.state.isInitializing
					? this.renderLoading()
					: this.state.error && !this.state.retryAvailable
					? this.renderError()
					: this.renderContent()}
			</ErrorBoundary>
		);
	}
}

export default ComponentOpenRouterKeys;
