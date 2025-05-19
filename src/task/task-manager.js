import { MemoryTaskHandler } from './memory-task-handler';
// Simple Task class since we don't have access to the actual implementation
class Task {
    id;
    status;
    constructor(id) {
        this.id = id;
        this.status = 'created';
    }
    updateStatus(status) {
        this.status = status;
    }
}
export class TaskManager {
    mcpManager;
    memoryTaskHandler;
    constructor(mcpManager) {
        this.mcpManager = mcpManager;
        // Initialize handlers
        this.memoryTaskHandler = new MemoryTaskHandler(mcpManager);
    }
    createTask(taskId) {
        return new Task(taskId);
    }
    async handleCommand(commandName, data) {
        switch (commandName) {
            // Existing cases...
            case 'ExecuteMemoryOperation':
                const { taskId, operation, parameters } = data;
                const task = this.createTask(taskId);
                return await this.memoryTaskHandler.handleMemoryOperation(task, parameters);
            default:
                throw new Error(`Unknown command: ${commandName}`);
        }
    }
}
//# sourceMappingURL=task-manager.js.map