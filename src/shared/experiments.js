export const EXPERIMENT_IDS = {
    AUTO_CONDENSE_CONTEXT: "autoCondenseContext",
    POWER_STEERING: "powerSteering",
};
export const experimentConfigsMap = {
    AUTO_CONDENSE_CONTEXT: { enabled: false },
    POWER_STEERING: { enabled: false },
};
export const experimentDefault = Object.fromEntries(Object.entries(experimentConfigsMap).map(([_, config]) => [
    EXPERIMENT_IDS[_],
    config.enabled,
]));
export const experiments = {
    get: (id) => experimentConfigsMap[id],
    isEnabled: (experimentsConfig, id) => experimentsConfig[id] ?? experimentDefault[id],
};
//# sourceMappingURL=experiments.js.map