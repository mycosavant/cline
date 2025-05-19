import { z } from "zod";
import { RooCodeEventName, rooCodeEventsSchema, rooCodeSettingsSchema } from "./index";
/**
 * Ack
 */
export const ackSchema = z.object({
    clientId: z.string(),
    pid: z.number(),
    ppid: z.number(),
});
/**
 * TaskCommand
 */
export var TaskCommandName;
(function (TaskCommandName) {
    TaskCommandName["StartNewTask"] = "StartNewTask";
    TaskCommandName["CancelTask"] = "CancelTask";
    TaskCommandName["CloseTask"] = "CloseTask";
})(TaskCommandName || (TaskCommandName = {}));
export const taskCommandSchema = z.discriminatedUnion("commandName", [
    z.object({
        commandName: z.literal(TaskCommandName.StartNewTask),
        data: z.object({
            configuration: rooCodeSettingsSchema,
            text: z.string(),
            images: z.array(z.string()).optional(),
            newTab: z.boolean().optional(),
        }),
    }),
    z.object({
        commandName: z.literal(TaskCommandName.CancelTask),
        data: z.string(),
    }),
    z.object({
        commandName: z.literal(TaskCommandName.CloseTask),
        data: z.string(),
    }),
]);
/**
 * TaskEvent
 */
export const taskEventSchema = z.discriminatedUnion("eventName", [
    z.object({
        eventName: z.literal(RooCodeEventName.Message),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.Message],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskCreated),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskCreated],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskStarted),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskStarted],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskModeSwitched),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskModeSwitched],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskPaused),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskPaused],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskUnpaused),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskUnpaused],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskAskResponded),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskAskResponded],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskAborted),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskAborted],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskSpawned),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskSpawned],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskCompleted),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskCompleted],
    }),
    z.object({
        eventName: z.literal(RooCodeEventName.TaskTokenUsageUpdated),
        payload: rooCodeEventsSchema.shape[RooCodeEventName.TaskTokenUsageUpdated],
    }),
]);
/**
 * IpcMessage
 */
export var IpcMessageType;
(function (IpcMessageType) {
    IpcMessageType["Connect"] = "Connect";
    IpcMessageType["Disconnect"] = "Disconnect";
    IpcMessageType["Ack"] = "Ack";
    IpcMessageType["TaskCommand"] = "TaskCommand";
    IpcMessageType["TaskEvent"] = "TaskEvent";
})(IpcMessageType || (IpcMessageType = {}));
export var IpcOrigin;
(function (IpcOrigin) {
    IpcOrigin["Client"] = "client";
    IpcOrigin["Server"] = "server";
})(IpcOrigin || (IpcOrigin = {}));
export const ipcMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal(IpcMessageType.Ack),
        origin: z.literal(IpcOrigin.Server),
        data: ackSchema,
    }),
    z.object({
        type: z.literal(IpcMessageType.TaskCommand),
        origin: z.literal(IpcOrigin.Client),
        clientId: z.string(),
        data: taskCommandSchema,
    }),
    z.object({
        type: z.literal(IpcMessageType.TaskEvent),
        origin: z.literal(IpcOrigin.Server),
        relayClientId: z.string().optional(),
        data: taskEventSchema,
    }),
]);
//# sourceMappingURL=ipc.js.map