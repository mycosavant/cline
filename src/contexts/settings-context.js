'use client';
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
// Create the context
const SettingsContext = createContext(null);
// Define default settings
const defaultSettings = {
    provider: 'gemini', // Default to Gemini
    geminiApiKey: null,
    geminiModel: 'gemini-1.5-flash', // Default Gemini model
    openRouterApiKey: null,
    // Default OpenRouter model - ensure it's a valid, common, low-cost model initially
    openRouterModel: process.env.NEXT_PUBLIC_OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini', // Default to gpt-4o-mini
};
// Local storage key
const SETTINGS_STORAGE_KEY = 'ai-pair-programmer-settings';
// Create the provider component
export function SettingsProvider({ children }) {
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const [settings, setSettings] = useState(defaultSettings); // Initialize with defaults first
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [openRouterModels, setOpenRouterModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsError, setModelsError] = useState(null);
    // Function to fetch OpenRouter models
    const fetchOpenRouterModels = useCallback(async () => {
        if (openRouterModels.length > 0 || modelsLoading) {
            return;
        }
        console.log("[SettingsContext] Fetching OpenRouter models...");
        setModelsLoading(true);
        setModelsError(null);
        try {
            const response = await fetch('/api/models/openrouter');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch models: ${response.status} ${errorText || response.statusText}`);
            }
            const data = await response.json();
            const fetchedModels = data.models;
            // Add provider info based on ID structure (e.g., "openai/gpt-4")
            const modelsWithProvider = fetchedModels.map(model => ({
                ...model,
                provider: model.id.split('/')[0] || 'unknown', // Extract provider from ID
            }));
            // Initial sort by combined input/output cost (ascending), then by name
            modelsWithProvider.sort((a, b) => {
                const costA = (a.inputCostMtok ?? Infinity) + (a.outputCostMtok ?? Infinity);
                const costB = (b.inputCostMtok ?? Infinity) + (b.outputCostMtok ?? Infinity);
                if (costA !== costB) {
                    return costA - costB;
                }
                return a.name.localeCompare(b.name); // Secondary sort by name
            });
            setOpenRouterModels(modelsWithProvider);
            console.log(`[SettingsContext] Successfully fetched and stored ${modelsWithProvider.length} OpenRouter models.`);
            // Ensure the default selected model exists, otherwise pick the cheapest one
            if (settings.provider === 'openrouter' && !modelsWithProvider.some(m => m.id === settings.openRouterModel) && modelsWithProvider.length > 0) {
                const cheapestModel = modelsWithProvider[0]; // Already sorted by cost
                console.warn(`[SettingsContext] Default OpenRouter model "${settings.openRouterModel}" not found in fetched list. Selecting cheapest model: "${cheapestModel.id}"`);
                // Use functional update to avoid stale state issues if fetch happens fast
                setSettings(prev => ({ ...prev, openRouterModel: cheapestModel.id }));
            }
        }
        catch (error) {
            console.error("[SettingsContext] Error fetching OpenRouter models:", error);
            setModelsError(error.message || 'Failed to fetch models');
            setOpenRouterModels([]);
        }
        finally {
            setModelsLoading(false);
        }
    }, [openRouterModels.length, modelsLoading, settings.provider, settings.openRouterModel]); // Dependencies updated
    // Effect to load settings from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            let loadedSettings = { ...defaultSettings }; // Start with defaults
            if (storedSettings) {
                try {
                    const parsedSettings = JSON.parse(storedSettings);
                    // Merge stored settings with defaults to ensure all keys are present
                    if (parsedSettings.provider !== 'gemini' && parsedSettings.provider !== 'openrouter') {
                        parsedSettings.provider = defaultSettings.provider;
                    }
                    // Ensure models are strings and not empty, fallback if necessary
                    parsedSettings.geminiModel = typeof parsedSettings.geminiModel === 'string' && parsedSettings.geminiModel ? parsedSettings.geminiModel : defaultSettings.geminiModel;
                    parsedSettings.openRouterModel = typeof parsedSettings.openRouterModel === 'string' && parsedSettings.openRouterModel ? parsedSettings.openRouterModel : defaultSettings.openRouterModel;
                    loadedSettings = { ...defaultSettings, ...parsedSettings };
                }
                catch (e) {
                    console.error("Failed to parse settings from localStorage", e);
                    // Fallback to default if parsing fails
                }
            }
            setSettings(loadedSettings); // Update state with loaded settings
            setIsInitialLoadComplete(true); // Mark loading as complete
            console.log("Settings loaded from localStorage:", loadedSettings);
            // Trigger fetch immediately after loading if provider is OpenRouter
            if (loadedSettings.provider === 'openrouter') {
                fetchOpenRouterModels();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // fetchOpenRouterModels is stable due to useCallback
    // Persist settings to local storage whenever they change (and after initial load)
    useEffect(() => {
        if (isInitialLoadComplete && typeof window !== 'undefined') {
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
                console.log("Settings saved to localStorage:", settings);
            }
            catch (e) {
                console.error("Failed to save settings to localStorage", e);
            }
        }
    }, [settings, isInitialLoadComplete]);
    // Determine the effective API keys
    const effectiveGeminiApiKey = (typeof window === 'undefined' ? process.env.GOOGLE_GENAI_API_KEY : process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY) || settings.geminiApiKey;
    const effectiveOpenRouterApiKey = (typeof window === 'undefined' ? process.env.OPENROUTER_API_KEY : process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) || settings.openRouterApiKey;
    const contextValue = useMemo(() => ({
        settings,
        setSettings,
        isSettingsOpen,
        setIsSettingsOpen,
        effectiveGeminiApiKey,
        effectiveOpenRouterApiKey,
        isInitialLoadComplete,
        openRouterModels,
        fetchOpenRouterModels,
        modelsLoading,
        modelsError,
        defaultSettings: defaultSettings, // Expose defaults
    }), [settings, isSettingsOpen, effectiveGeminiApiKey, effectiveOpenRouterApiKey, isInitialLoadComplete, openRouterModels, fetchOpenRouterModels, modelsLoading, modelsError]);
    return (<SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>);
}
// Custom hook to use the SettingsContext
export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
// Export default settings for use elsewhere if needed (e.g., resetting state)
export { defaultSettings };
//# sourceMappingURL=settings-context.js.map