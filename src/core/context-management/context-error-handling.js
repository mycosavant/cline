export function checkIsOpenRouterContextWindowError(error) {
    return error.code === 400 && error.message?.includes("context length");
}
export function checkIsAnthropicContextWindowError(response) {
    return (response?.error?.error?.type === "invalid_request_error" &&
        response?.error?.error?.message?.includes("prompt is too long"));
}
//# sourceMappingURL=context-error-handling.js.map