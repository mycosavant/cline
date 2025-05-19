import { ZodError } from "zod";
import { PROVIDER_SETTINGS_KEYS, GLOBAL_SETTINGS_KEYS, SECRET_STATE_KEYS, GLOBAL_STATE_KEYS, providerSettingsSchema, globalSettingsSchema, isSecretStateKey, } from "../../schemas";
import { logger } from "../../utils/logging";
import { telemetryService } from "../../services/telemetry/TelemetryService";
const PASS_THROUGH_STATE_KEYS = ["taskHistory"];
export const isPassThroughStateKey = (key) => PASS_THROUGH_STATE_KEYS.includes(key);
const globalSettingsExportSchema = globalSettingsSchema.omit({
    taskHistory: true,
    listApiConfigMeta: true,
    currentApiConfigName: true,
});
export class ContextProxy {
    originalContext;
    stateCache;
    secretCache;
    _isInitialized = false;
    constructor(context) {
        this.originalContext = context;
        this.stateCache = {};
        this.secretCache = {};
        this._isInitialized = false;
    }
    get isInitialized() {
        return this._isInitialized;
    }
    async initialize() {
        for (const key of GLOBAL_STATE_KEYS) {
            try {
                // Revert to original assignment
                this.stateCache[key] = this.originalContext.globalState.get(key);
            }
            catch (error) {
                logger.error(`Error loading global ${key}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const promises = SECRET_STATE_KEYS.map(async (key) => {
            try {
                this.secretCache[key] = await this.originalContext.secrets.get(key);
            }
            catch (error) {
                logger.error(`Error loading secret ${key}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
        await Promise.all(promises);
        this._isInitialized = true;
    }
    get extensionUri() {
        return this.originalContext.extensionUri;
    }
    get extensionPath() {
        return this.originalContext.extensionPath;
    }
    get globalStorageUri() {
        return this.originalContext.globalStorageUri;
    }
    get logUri() {
        return this.originalContext.logUri;
    }
    get extension() {
        return this.originalContext.extension;
    }
    get extensionMode() {
        return this.originalContext.extensionMode;
    }
    getGlobalState(key, defaultValue) {
        if (isPassThroughStateKey(key)) {
            const value = this.originalContext.globalState.get(key);
            return value === undefined || value === null ? defaultValue : value;
        }
        const value = this.stateCache[key];
        return value !== undefined ? value : defaultValue;
    }
    updateGlobalState(key, value) {
        if (isPassThroughStateKey(key)) {
            return this.originalContext.globalState.update(key, value);
        }
        this.stateCache[key] = value;
        return this.originalContext.globalState.update(key, value);
    }
    getAllGlobalState() {
        return Object.fromEntries(GLOBAL_STATE_KEYS.map((key) => [key, this.getGlobalState(key)]));
    }
    /**
     * ExtensionContext.secrets
     * https://code.visualstudio.com/api/references/vscode-api#ExtensionContext.secrets
     */
    getSecret(key) {
        return this.secretCache[key];
    }
    storeSecret(key, value) {
        // Update cache.
        this.secretCache[key] = value;
        // Write directly to context.
        return value === undefined
            ? this.originalContext.secrets.delete(key)
            : this.originalContext.secrets.store(key, value);
    }
    getAllSecretState() {
        return Object.fromEntries(SECRET_STATE_KEYS.map((key) => [key, this.getSecret(key)]));
    }
    /**
     * GlobalSettings
     */
    getGlobalSettings() {
        const values = this.getValues();
        try {
            return globalSettingsSchema.parse(values);
        }
        catch (error) {
            if (error instanceof ZodError) {
                telemetryService.captureSchemaValidationError({ schemaName: "GlobalSettings", error });
            }
            return GLOBAL_SETTINGS_KEYS.reduce((acc, key) => ({ ...acc, [key]: values[key] }), {});
        }
    }
    /**
     * ProviderSettings
     */
    getProviderSettings() {
        const values = this.getValues();
        try {
            return providerSettingsSchema.parse(values);
        }
        catch (error) {
            if (error instanceof ZodError) {
                telemetryService.captureSchemaValidationError({ schemaName: "ProviderSettings", error });
            }
            return PROVIDER_SETTINGS_KEYS.reduce((acc, key) => ({ ...acc, [key]: values[key] }), {});
        }
    }
    async setProviderSettings(values) {
        // Explicitly clear out any old API configuration values before that
        // might not be present in the new configuration.
        // If a value is not present in the new configuration, then it is assumed
        // that the setting's value should be `undefined` and therefore we
        // need to remove it from the state cache if it exists.
        // Ensure openAiHeaders is always an object even when empty
        // This is critical for proper serialization/deserialization through IPC
        if (values.openAiHeaders !== undefined) {
            // Check if it's empty or null
            if (!values.openAiHeaders || Object.keys(values.openAiHeaders).length === 0) {
                values.openAiHeaders = {};
            }
        }
        await this.setValues({
            ...PROVIDER_SETTINGS_KEYS.filter((key) => !isSecretStateKey(key))
                .filter((key) => !!this.stateCache[key])
                .reduce((acc, key) => ({ ...acc, [key]: undefined }), {}),
            ...values,
        });
    }
    /**
     * RooCodeSettings
     */
    setValue(key, value) {
        return isSecretStateKey(key) ? this.storeSecret(key, value) : this.updateGlobalState(key, value);
    }
    getValue(key) {
        return isSecretStateKey(key)
            ? this.getSecret(key)
            : this.getGlobalState(key);
    }
    getValues() {
        return { ...this.getAllGlobalState(), ...this.getAllSecretState() };
    }
    async setValues(values) {
        const entries = Object.entries(values);
        await Promise.all(entries.map(([key, value]) => this.setValue(key, value)));
    }
    /**
     * Import / Export
     */
    async export() {
        try {
            const globalSettings = globalSettingsExportSchema.parse(this.getValues());
            // Exports should only contain global settings, so this skips project custom modes (those exist in the .roomode folder)
            globalSettings.customModes = globalSettings.customModes?.filter((mode) => mode.source === "global");
            return Object.fromEntries(Object.entries(globalSettings).filter(([_, value]) => value !== undefined));
        }
        catch (error) {
            if (error instanceof ZodError) {
                telemetryService.captureSchemaValidationError({ schemaName: "GlobalSettings", error });
            }
            return undefined;
        }
    }
    /**
     * Resets all global state, secrets, and in-memory caches.
     * This clears all data from both the in-memory caches and the VSCode storage.
     * @returns A promise that resolves when all reset operations are complete
     */
    async resetAllState() {
        // Clear in-memory caches
        this.stateCache = {};
        this.secretCache = {};
        await Promise.all([
            ...GLOBAL_STATE_KEYS.map((key) => this.originalContext.globalState.update(key, undefined)),
            ...SECRET_STATE_KEYS.map((key) => this.originalContext.secrets.delete(key)),
        ]);
        await this.initialize();
    }
    static _instance = null;
    static get instance() {
        if (!this._instance) {
            throw new Error("ContextProxy not initialized");
        }
        return this._instance;
    }
    static async getInstance(context) {
        if (this._instance) {
            return this._instance;
        }
        this._instance = new ContextProxy(context);
        await this._instance.initialize();
        return this._instance;
    }
}
//# sourceMappingURL=ContextProxy.js.map