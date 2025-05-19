import { logger } from "../../utils/logging";
import { PostHogClient } from "./PostHogClient";
/**
 * TelemetryService wrapper class that defers PostHogClient initialization
 * This ensures that we only create the PostHogClient after environment variables are loaded
 */
class TelemetryService {
    client = null;
    initialized = false;
    /**
     * Initialize the telemetry service with the PostHog client
     * This should be called after environment variables are loaded
     */
    initialize() {
        if (this.initialized) {
            return;
        }
        try {
            this.client = PostHogClient.getInstance();
            this.initialized = true;
        }
        catch (error) {
            console.warn("Failed to initialize telemetry service:", error);
        }
    }
    /**
     * Sets the ClineProvider reference to use for global properties
     * @param provider A ClineProvider instance to use
     */
    setProvider(provider) {
        // If client is initialized, pass the provider reference
        if (this.isReady) {
            this.client.setProvider(provider);
        }
        logger.debug("TelemetryService: ClineProvider reference set");
    }
    /**
     * Base method for all telemetry operations
     * Checks if the service is initialized before performing any operation
     * @returns Whether the service is ready to use
     */
    get isReady() {
        return this.initialized && this.client !== null;
    }
    /**
     * Updates the telemetry state based on user preferences and VSCode settings
     * @param didUserOptIn Whether the user has explicitly opted into telemetry
     */
    updateTelemetryState(didUserOptIn) {
        if (!this.isReady) {
            return;
        }
        this.client.updateTelemetryState(didUserOptIn);
    }
    /**
     * Captures a telemetry event if telemetry is enabled
     * @param event The event to capture with its properties
     */
    capture(event) {
        if (!this.isReady) {
            return;
        }
        this.client.capture(event);
    }
    /**
     * Generic method to capture any type of event with specified properties
     * @param eventName The event name to capture
     * @param properties The event properties
     */
    captureEvent(eventName, properties) {
        this.capture({ event: eventName, properties });
    }
    // Task events convenience methods
    captureTaskCreated(taskId) {
        this.captureEvent(PostHogClient.EVENTS.TASK.CREATED, { taskId });
    }
    captureTaskRestarted(taskId) {
        this.captureEvent(PostHogClient.EVENTS.TASK.RESTARTED, { taskId });
    }
    captureTaskCompleted(taskId) {
        this.captureEvent(PostHogClient.EVENTS.TASK.COMPLETED, { taskId });
    }
    captureConversationMessage(taskId, source) {
        this.captureEvent(PostHogClient.EVENTS.TASK.CONVERSATION_MESSAGE, { taskId, source });
    }
    captureModeSwitch(taskId, newMode) {
        this.captureEvent(PostHogClient.EVENTS.TASK.MODE_SWITCH, { taskId, newMode });
    }
    captureToolUsage(taskId, tool) {
        this.captureEvent(PostHogClient.EVENTS.TASK.TOOL_USED, { taskId, tool });
    }
    captureCheckpointCreated(taskId) {
        this.captureEvent(PostHogClient.EVENTS.TASK.CHECKPOINT_CREATED, { taskId });
    }
    captureCheckpointDiffed(taskId) {
        this.captureEvent(PostHogClient.EVENTS.TASK.CHECKPOINT_DIFFED, { taskId });
    }
    captureCheckpointRestored(taskId) {
        this.captureEvent(PostHogClient.EVENTS.TASK.CHECKPOINT_RESTORED, { taskId });
    }
    captureCodeActionUsed(actionType) {
        this.captureEvent(PostHogClient.EVENTS.TASK.CODE_ACTION_USED, { actionType });
    }
    capturePromptEnhanced(taskId) {
        this.captureEvent(PostHogClient.EVENTS.TASK.PROMPT_ENHANCED, { ...(taskId && { taskId }) });
    }
    captureSchemaValidationError({ schemaName, error }) {
        // https://zod.dev/ERROR_HANDLING?id=formatting-errors
        this.captureEvent(PostHogClient.EVENTS.ERRORS.SCHEMA_VALIDATION_ERROR, { schemaName, error: error.format() });
    }
    captureDiffApplicationError(taskId, consecutiveMistakeCount) {
        this.captureEvent(PostHogClient.EVENTS.ERRORS.DIFF_APPLICATION_ERROR, { taskId, consecutiveMistakeCount });
    }
    captureShellIntegrationError(taskId) {
        this.captureEvent(PostHogClient.EVENTS.ERRORS.SHELL_INTEGRATION_ERROR, { taskId });
    }
    captureConsecutiveMistakeError(taskId) {
        this.captureEvent(PostHogClient.EVENTS.ERRORS.CONSECUTIVE_MISTAKE_ERROR, { taskId });
    }
    /**
     * Captures a title button click event
     * @param button The button that was clicked
     */
    captureTitleButtonClicked(button) {
        this.captureEvent("Title Button Clicked", { button });
    }
    /**
     * Checks if telemetry is currently enabled
     * @returns Whether telemetry is enabled
     */
    isTelemetryEnabled() {
        return this.isReady && this.client.isTelemetryEnabled();
    }
    /**
     * Shuts down the PostHog client
     */
    async shutdown() {
        if (!this.isReady) {
            return;
        }
        await this.client.shutdown();
    }
}
// Export a singleton instance of the telemetry service wrapper
export const telemetryService = new TelemetryService();
//# sourceMappingURL=TelemetryService.js.map