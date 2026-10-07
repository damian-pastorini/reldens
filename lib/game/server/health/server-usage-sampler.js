/**
 *
 * Reldens - ServerUsageSampler
 *
 * Reads the current server usage from the operating system and the Node.js process: the system memory used percent
 * (from the available memory, on Linux os.freemem() is the MemAvailable value), the system CPU used percent of all the
 * cores since the previous sample, the mean event loop delay since the previous sample, and as information the free
 * and total system memory and the process memory (RSS and JS heap).
 *
 */

const os = require('os');
const { monitorEventLoopDelay } = require('perf_hooks');
const { HealthConst } = require('./constants');
const { sc } = require('@reldens/utils');

class ServerUsageSampler
{

    /**
     * @param {number} [eventLoopResolutionMs]
     */
    constructor(eventLoopResolutionMs = HealthConst.DEFAULTS.EVENT_LOOP_RESOLUTION_MS)
    {
        /** @type {number} */
        this.eventLoopResolutionMs = Number(eventLoopResolutionMs);
        /** @type {number} */
        this.bytesPerMegabyte = 1048576;
        /** @type {number} */
        this.nanosecondsPerMillisecond = 1000000;
        /** @type {number} */
        this.valuesPrecision = 1;
        /** @type {import('perf_hooks').IntervalHistogram} */
        this.eventLoopDelayHistogram = monitorEventLoopDelay({resolution: this.eventLoopResolutionMs});
        this.eventLoopDelayHistogram.enable();
        /** @type {{idle: number, total: number}} */
        this.previousCpuTimes = this.readCpuTimes();
    }

    /**
     * @returns {Object}
     */
    sample()
    {
        let cpuTimes = this.readCpuTimes();
        let totalMemory = os.totalmem();
        let freeMemory = os.freemem();
        let memoryUsage = process.memoryUsage();
        let usage = {
            memoryPercent: sc.roundToPrecision((totalMemory - freeMemory) / totalMemory * 100, this.valuesPrecision),
            cpuPercent: this.calculateCpuPercent(cpuTimes),
            eventLoopDelayMs: this.fetchEventLoopDelayMs(),
            freeMemoryMb: Math.round(freeMemory / this.bytesPerMegabyte),
            totalMemoryMb: Math.round(totalMemory / this.bytesPerMegabyte),
            processMemoryMb: Math.round(memoryUsage.rss / this.bytesPerMegabyte),
            heapUsedMb: Math.round(memoryUsage.heapUsed / this.bytesPerMegabyte),
            sampledAt: Date.now()
        };
        this.previousCpuTimes = cpuTimes;
        this.eventLoopDelayHistogram.reset();
        return usage;
    }

    /**
     * @returns {{idle: number, total: number}}
     */
    readCpuTimes()
    {
        let cpuTimes = {idle: 0, total: 0};
        for(let cpu of os.cpus()){
            cpuTimes.idle += cpu.times.idle;
            cpuTimes.total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
        }
        return cpuTimes;
    }

    /**
     * @param {{idle: number, total: number}} cpuTimes
     * @returns {number}
     */
    calculateCpuPercent(cpuTimes)
    {
        let totalDelta = cpuTimes.total - this.previousCpuTimes.total;
        if(0 >= totalDelta){
            return 0;
        }
        return sc.roundToPrecision(
            (1 - (cpuTimes.idle - this.previousCpuTimes.idle) / totalDelta) * 100,
            this.valuesPrecision
        );
    }

    /**
     * @returns {number}
     */
    fetchEventLoopDelayMs()
    {
        if(0 === this.eventLoopDelayHistogram.count){
            return 0;
        }
        return sc.roundToPrecision(
            Math.max(0, this.eventLoopDelayHistogram.mean / this.nanosecondsPerMillisecond - this.eventLoopResolutionMs),
            this.valuesPrecision
        );
    }

}

module.exports.ServerUsageSampler = ServerUsageSampler;
