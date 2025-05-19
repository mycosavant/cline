/**
 * Feature flags utility functions
 */
import { features } from '../config/features';
/**
 * Checks if a feature is enabled
 * @param featureName Name of the feature to check
 * @returns True if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(featureName) {
    return features[featureName] === true;
}
/**
 * Conditionally executes code based on a feature flag
 * @param featureName Name of the feature to check
 * @param callback Function to execute if the feature is enabled
 * @param fallback Function to execute if the feature is disabled
 * @returns Result of the callback or fallback function
 */
export function requireFeature(featureName, callback, fallback) {
    return isFeatureEnabled(featureName) ? callback() : fallback();
}
/**
 * Sets a feature flag value (for runtime toggling)
 * @param featureName Name of the feature to set
 * @param enabled Whether the feature should be enabled
 */
export function setFeatureEnabled(featureName, enabled) {
    features[featureName] = enabled;
}
//# sourceMappingURL=feature-flags.js.map