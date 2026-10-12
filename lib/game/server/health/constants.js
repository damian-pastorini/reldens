/**
 *
 * Reldens - HealthConst
 *
 * Server health defaults and the limits checks: each check compares one usage value with its maximum, and a limit of
 * 0 is disabled. The blocking switch turns the whole blocking process on or off, when it is off the health is only a
 * monitor. The status token value is the signed value of the server status requests between servers.
 *
 */

module.exports.HealthConst = {
    DEFAULTS: {
        BLOCKING_ENABLED: true,
        CHECK_INTERVAL_MS: 5000,
        MAX_MEMORY_PERCENT: 90,
        MAX_CPU_PERCENT: 90,
        MAX_EVENT_LOOP_DELAY_MS: 1000,
        REMOTE_STATUS_TIMEOUT_MS: 3000,
        EVENT_LOOP_RESOLUTION_MS: 20
    },
    LIMITS_CHECKS: [
        {limitKey: 'maxMemoryPercent', usageKey: 'memoryPercent'},
        {limitKey: 'maxCpuPercent', usageKey: 'cpuPercent'},
        {limitKey: 'maxEventLoopDelayMs', usageKey: 'eventLoopDelayMs'}
    ],
    STATUS_TOKEN_VALUE: 'reldens-server-status'
};
