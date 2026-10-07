/**
 *
 * Reldens - ServerHealthMonitor
 *
 * Samples the server usage on an interval and compares it with the configured limits. While any limit is exceeded
 * the server is overloaded. When the blocking is enabled an overloaded server is blocking: the game login, the scene
 * rooms creation and the RoomsAvailability read isBlocking to reject the new load until the usage is back under the
 * limits, the players already in the game keep playing in the rooms already created. When the blocking is disabled
 * the health is only a monitor: the usage and the exceeded limits are reported but nothing is rejected. The
 * usageReport is the server status answered to the administration panel and to the other servers.
 *
 */

const { ServerUsageSampler } = require('./server-usage-sampler');
const { HealthConst } = require('./constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} ServerHealthMonitorProps
 * @property {boolean} [blockingEnabled] - Block the new load while overloaded, when disabled it is only a monitor
 * @property {number} [checkIntervalMs]
 * @property {number} [maxMemoryPercent] - Maximum system memory used percent, 0 disables the limit
 * @property {number} [maxCpuPercent] - Maximum system CPU used percent of all the cores, 0 disables the limit
 * @property {number} [maxEventLoopDelayMs] - Maximum mean event loop delay, 0 disables the limit
 */
class ServerHealthMonitor
{

    /**
     * @param {ServerHealthMonitorProps} props
     * @param {ServerUsageSampler} [usageSampler]
     */
    constructor(props, usageSampler)
    {
        let defaults = HealthConst.DEFAULTS;
        /** @type {boolean} */
        this.blockingEnabled = Boolean(sc.get(props, 'blockingEnabled', defaults.BLOCKING_ENABLED));
        /** @type {number} */
        this.checkIntervalMs = Number(sc.get(props, 'checkIntervalMs', defaults.CHECK_INTERVAL_MS));
        /** @type {Object<string, number>} */
        this.limits = {
            maxMemoryPercent: Number(sc.get(props, 'maxMemoryPercent', defaults.MAX_MEMORY_PERCENT)),
            maxCpuPercent: Number(sc.get(props, 'maxCpuPercent', defaults.MAX_CPU_PERCENT)),
            maxEventLoopDelayMs: Number(sc.get(props, 'maxEventLoopDelayMs', defaults.MAX_EVENT_LOOP_DELAY_MS))
        };
        /** @type {ServerUsageSampler} */
        this.usageSampler = usageSampler || new ServerUsageSampler();
        /** @type {boolean} */
        this.isOverloaded = false;
        /** @type {boolean} */
        this.isBlocking = false;
        /** @type {Object} */
        this.usageReport = {
            blockingEnabled: this.blockingEnabled,
            isOverloaded: false,
            isBlocking: false,
            exceededLimits: [],
            limits: this.limits,
            usage: false
        };
        /** @type {NodeJS.Timeout|boolean} */
        this.checkTimer = false;
    }

    /**
     * @returns {boolean}
     */
    start()
    {
        if(this.checkTimer){
            return false;
        }
        if(0 < this.checkIntervalMs){
            this.checkUsage();
            this.checkTimer = setInterval(() => this.checkUsage(), this.checkIntervalMs);
            this.checkTimer.unref();
            Logger.info('Server health monitor started.', {
                blockingEnabled: this.blockingEnabled,
                checkIntervalMs: this.checkIntervalMs,
                limits: this.limits
            });
            return true;
        }
        Logger.error('Invalid server health check interval: '+this.checkIntervalMs+'.');
        return false;
    }

    /**
     * @returns {Object}
     */
    checkUsage()
    {
        let wasOverloaded = this.isOverloaded;
        let usage = this.usageSampler.sample();
        let exceededLimits = this.fetchExceededLimits(usage);
        this.isOverloaded = 0 < exceededLimits.length;
        this.isBlocking = this.blockingEnabled && this.isOverloaded;
        this.usageReport = {
            blockingEnabled: this.blockingEnabled,
            isOverloaded: this.isOverloaded,
            isBlocking: this.isBlocking,
            exceededLimits,
            limits: this.limits,
            usage
        };
        this.logStatusChange(wasOverloaded);
        return this.usageReport;
    }

    /**
     * @param {Object} usage
     * @returns {Array<string>}
     */
    fetchExceededLimits(usage)
    {
        let exceededLimits = [];
        for(let limitCheck of HealthConst.LIMITS_CHECKS){
            let limitValue = this.limits[limitCheck.limitKey];
            if(0 >= limitValue){
                continue;
            }
            if(usage[limitCheck.usageKey] > limitValue){
                exceededLimits.push(limitCheck.limitKey);
            }
        }
        return exceededLimits;
    }

    /**
     * @param {boolean} wasOverloaded
     * @returns {boolean}
     */
    logStatusChange(wasOverloaded)
    {
        if(wasOverloaded === this.isOverloaded){
            return false;
        }
        if(this.isOverloaded){
            Logger.warning(
                this.isBlocking
                    ? 'Server overloaded, the new logins, the arriving players and the new scene rooms are rejected.'
                    : 'Server usage over the limits, the blocking is disabled so nothing is rejected.',
                {exceededLimits: this.usageReport.exceededLimits, usage: this.usageReport.usage}
            );
            return true;
        }
        Logger.notice('Server usage back under the limits.', {usage: this.usageReport.usage});
        return true;
    }

}

module.exports.ServerHealthMonitor = ServerHealthMonitor;
