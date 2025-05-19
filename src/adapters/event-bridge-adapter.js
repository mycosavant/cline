/**
 * Event Bridge Adapter
 *
 * Implements a bridge for events between roo-code and coding-memory
 */
/**
 * Event Bridge Adapter for connecting roo-code and coding-memory event systems
 */
export class EventBridgeAdapter {
    systemEventBus;
    eventEmitter;
    subscriptions = [];
    /**
     * Creates a new Event Bridge Adapter
     * @param eventEmitter roo-code event emitter
     * @param systemEventBus coding-memory system event bus
     */
    constructor(eventEmitter, systemEventBus) {
        this.systemEventBus = systemEventBus;
        this.eventEmitter = eventEmitter;
        this.setupEventBridges();
    }
    /**
     * Sets up event bridges between roo-code and coding-memory
     */
    setupEventBridges() {
        // Forward roo-code events to coding-memory
        this.eventEmitter.on('*', (event, data) => {
            this.systemEventBus.publish(`roo-code:${event}`, data, 'roo-code', { priority: 'normal' });
        });
        // Forward coding-memory events to roo-code
        this.subscriptions.push(this.systemEventBus.subscribe('*', (event) => {
            this.eventEmitter.emit(`coding-memory:${event.type}`, event.payload);
        }));
        // Set up specific event mappings
        this.setupSpecificEventMappings();
    }
    /**
     * Sets up specific event mappings between roo-code and coding-memory
     */
    setupSpecificEventMappings() {
        // File events
        this.eventEmitter.on('file:opened', (data) => {
            this.systemEventBus.publish('file:opened', data, 'roo-code', { priority: 'high' });
        });
        this.eventEmitter.on('file:saved', (data) => {
            this.systemEventBus.publish('file:saved', data, 'roo-code', { priority: 'high' });
        });
        // Editor events
        this.eventEmitter.on('editor:selection-changed', (data) => {
            this.systemEventBus.publish('editor:selection-changed', data, 'roo-code', { priority: 'normal' });
        });
        // Memory events
        this.subscriptions.push(this.systemEventBus.subscribe('memory:entity-stored', (event) => {
            this.eventEmitter.emit('coding-memory:entity-stored', event.payload);
        }));
        this.subscriptions.push(this.systemEventBus.subscribe('memory:entity-updated', (event) => {
            this.eventEmitter.emit('coding-memory:entity-updated', event.payload);
        }));
        // Cognitive events
        this.subscriptions.push(this.systemEventBus.subscribe('cognitive:insights-available', (event) => {
            this.eventEmitter.emit('coding-memory:insights-available', event.payload);
        }));
        // Tool evolution events
        this.subscriptions.push(this.systemEventBus.subscribe('tool:synthesized', (event) => {
            this.eventEmitter.emit('coding-memory:tool-synthesized', event.payload);
        }));
        // Collaborative intelligence events
        this.subscriptions.push(this.systemEventBus.subscribe('collaboration:mental-model-updated', (event) => {
            this.eventEmitter.emit('coding-memory:mental-model-updated', event.payload);
        }));
    }
    /**
     * Disposes the event bridge
     */
    dispose() {
        // Clean up subscriptions
        this.subscriptions.forEach(id => this.systemEventBus.unsubscribe(id));
        // Remove event listeners
        this.eventEmitter.removeAllListeners();
    }
}
//# sourceMappingURL=event-bridge-adapter.js.map