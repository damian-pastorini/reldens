/**
 *
 * Reldens - Test Server Health Monitor
 *
 */

const os = require('os');
const { BaseTest } = require('./base-test');
const { ServerHealthMonitor } = require('../lib/game/server/health/server-health-monitor');
const { ServerUsageSampler } = require('../lib/game/server/health/server-usage-sampler');
const { RoomsUsageCollector } = require('../lib/game/server/health/rooms-usage-collector');
const { WorldTimer } = require('../lib/world/world-timer');
const { EnvironmentVariablesReader } = require('../lib/game/server/environment-variables-reader');
const { ServerManagersInitializer } = require('../lib/game/server/server-managers-initializer');
const { GameServer } = require('../lib/game/server/game-server');
const { sc } = require('@reldens/utils');

class TestServerHealthMonitor extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.defaultUsage = {
            memoryPercent: 50,
            cpuPercent: 20,
            eventLoopDelayMs: 5,
            freeMemoryMb: 1000,
            totalMemoryMb: 2000,
            processMemoryMb: 300,
            heapUsedMb: 120,
            sampledAt: 1
        };
        this.defaultLimits = {
            blockingEnabled: true,
            checkIntervalMs: 5000,
            maxMemoryPercent: 90,
            maxCpuPercent: 90,
            maxEventLoopDelayMs: 1000
        };
    }

    createMonitor(customLimits, usageSamples, roomsUsageCollector)
    {
        return new ServerHealthMonitor(
            Object.assign({}, this.defaultLimits, customLimits),
            {sample: () => Object.assign({}, this.defaultUsage, usageSamples.shift())},
            roomsUsageCollector
        );
    }

    readHealthEnvironment(environmentValues)
    {
        let previousValues = {};
        for(let key of Object.keys(environmentValues)){
            if(sc.hasOwn(process.env, key)){
                previousValues[key] = process.env[key];
            }
            process.env[key] = environmentValues[key];
        }
        let healthConfig = EnvironmentVariablesReader.fetchHealthFromEnvironmentVariables();
        for(let key of Object.keys(environmentValues)){
            delete process.env[key];
        }
        Object.assign(process.env, previousValues);
        return healthConfig;
    }

    async testTheMemoryPercentAboveTheLimitOverloadsTheServer()
    {
        await this.test('a system memory used percent above the maximum overloads the server', async () => {
            let monitor = this.createMonitor({}, [{memoryPercent: 93.5}]);
            let usageReport = monitor.checkUsage();
            this.assert.strictEqual(monitor.isOverloaded, true);
            this.assert.strictEqual(monitor.isBlocking, true);
            this.assert.strictEqual(usageReport.isBlocking, true);
            this.assert.deepStrictEqual(usageReport.exceededLimits, ['maxMemoryPercent']);
        });
    }

    async testTheCpuAndMemoryHaveTheirOwnLimits()
    {
        await this.test('the CPU and the memory are compared with their own maximum', async () => {
            let monitor = this.createMonitor(
                {maxMemoryPercent: 80, maxCpuPercent: 95},
                [{memoryPercent: 85, cpuPercent: 92}, {memoryPercent: 70, cpuPercent: 97}]
            );
            this.assert.deepStrictEqual(monitor.checkUsage().exceededLimits, ['maxMemoryPercent']);
            this.assert.deepStrictEqual(monitor.checkUsage().exceededLimits, ['maxCpuPercent']);
        });
    }

    async testTheMaximumLimitsAreAllReported()
    {
        await this.test('the memory, CPU and event loop delay above their maximum are all reported', async () => {
            let monitor = this.createMonitor(
                {},
                [{memoryPercent: 95, cpuPercent: 99, eventLoopDelayMs: 1500}]
            );
            this.assert.deepStrictEqual(
                monitor.checkUsage().exceededLimits,
                ['maxMemoryPercent', 'maxCpuPercent', 'maxEventLoopDelayMs']
            );
        });
    }

    async testTheZeroLimitIsDisabled()
    {
        await this.test('a limit of 0 is never exceeded', async () => {
            let monitor = this.createMonitor(
                {maxMemoryPercent: 0, maxCpuPercent: 0, maxEventLoopDelayMs: 0},
                [{memoryPercent: 100, cpuPercent: 100, eventLoopDelayMs: 9000}]
            );
            this.assert.deepStrictEqual(monitor.checkUsage().exceededLimits, []);
            this.assert.strictEqual(monitor.isOverloaded, false);
        });
    }

    async testTheDisabledBlockingOnlyMonitorsTheUsage()
    {
        await this.test('with the blocking disabled the exceeded limits are reported but nothing is blocked', async () => {
            let monitor = this.createMonitor({blockingEnabled: false}, [{memoryPercent: 99}]);
            let usageReport = monitor.checkUsage();
            this.assert.strictEqual(monitor.isOverloaded, true);
            this.assert.strictEqual(monitor.isBlocking, false);
            this.assert.strictEqual(usageReport.blockingEnabled, false);
            this.assert.strictEqual(usageReport.isBlocking, false);
            this.assert.deepStrictEqual(usageReport.exceededLimits, ['maxMemoryPercent']);
            this.assert.strictEqual(usageReport.usage.memoryPercent, 99);
        });
    }

    async testTheServerRecoversWhenTheUsageIsBackUnderTheLimits()
    {
        await this.test('the server is not overloaded once the usage is back under the limits', async () => {
            let monitor = this.createMonitor({}, [{memoryPercent: 95}, {memoryPercent: 60}]);
            monitor.checkUsage();
            this.assert.strictEqual(monitor.isBlocking, true);
            let usageReport = monitor.checkUsage();
            this.assert.strictEqual(monitor.isOverloaded, false);
            this.assert.strictEqual(monitor.isBlocking, false);
            this.assert.deepStrictEqual(usageReport.exceededLimits, []);
        });
    }

    async testTheUsageReportIncludesTheRoomsUsage()
    {
        await this.test('the usage report summarizes the rooms usage and reads the physics steps counters', async () => {
            let worldTimer = new WorldTimer({});
            worldTimer.stepsCount = 3;
            worldTimer.stepsDurationMs = 1.5;
            let createdInstances = {
                sceneRoomId: {
                    clients: [{}],
                    playersCountInState: () => 1,
                    roomWorld: {bodies: [{}, {}]},
                    worldTimer
                },
                chatRoomId: {clients: [{}, {}]}
            };
            let monitor = this.createMonitor({}, [{}], new RoomsUsageCollector(createdInstances));
            let roomsUsage = monitor.checkUsage().roomsUsage;
            this.assert.strictEqual(roomsUsage.roomsCount, 2);
            this.assert.strictEqual(roomsUsage.sceneRoomsCount, 1);
            this.assert.strictEqual(roomsUsage.playersCount, 1);
            this.assert.strictEqual(sc.isNumber(roomsUsage.physicsBusyPercent), true);
            this.assert.strictEqual(worldTimer.stepsCount, 0);
            this.assert.strictEqual(worldTimer.stepsDurationMs, 0);
        });
    }

    async testTheUsageReportWithoutRoomsCollector()
    {
        await this.test('the usage report has no rooms usage without a rooms usage collector', async () => {
            this.assert.strictEqual(this.createMonitor({}, [{}]).checkUsage().roomsUsage, false);
        });
    }

    async testTheInvalidIntervalDoesNotStartTheChecks()
    {
        await this.test('a check interval of 0 does not start the checks', async () => {
            let monitor = this.createMonitor({checkIntervalMs: 0}, [{}]);
            this.assert.strictEqual(monitor.start(), false);
            this.assert.strictEqual(monitor.checkTimer, false);
            this.assert.strictEqual(monitor.usageReport.usage, false);
        });
    }

    async testTheMonitorStartsOnceWithAnInitialCheck()
    {
        await this.test('the monitor checks the usage when it starts and it can not be started twice', async () => {
            let monitor = this.createMonitor({}, [{memoryPercent: 42}, {}]);
            this.assert.strictEqual(monitor.start(), true);
            let startedTimer = monitor.checkTimer;
            this.assert.strictEqual(monitor.start(), false);
            clearInterval(monitor.checkTimer);
            this.assert.strictEqual(monitor.checkTimer, startedTimer);
            this.assert.strictEqual(monitor.usageReport.usage.memoryPercent, 42);
        });
    }

    async testTheSamplerReadsTheSystemAndProcessUsage()
    {
        await this.test('the sampler reads the system memory, the CPU and the process usage', async () => {
            let usageSampler = new ServerUsageSampler();
            let usage = usageSampler.sample();
            usageSampler.eventLoopDelayHistogram.disable();
            this.assert.strictEqual(usage.totalMemoryMb, Math.round(os.totalmem() / 1048576));
            this.assert.strictEqual(usage.eventLoopDelayMs, 0);
            this.assert.strictEqual(sc.isNumber(usage.memoryPercent), true);
            this.assert.strictEqual(sc.isNumber(usage.cpuPercent), true);
            this.assert.strictEqual(sc.isNumber(usage.freeMemoryMb), true);
            this.assert.strictEqual(sc.isNumber(usage.processMemoryMb), true);
            this.assert.strictEqual(sc.isNumber(usage.heapUsedMb), true);
        });
    }

    async testTheSamplerCalculatesTheCpuUsedPercentBetweenSamples()
    {
        await this.test('the CPU used percent is the not idle time between two samples', async () => {
            let usageSampler = new ServerUsageSampler();
            usageSampler.eventLoopDelayHistogram.disable();
            usageSampler.previousCpuTimes = {idle: 1000, total: 2000};
            this.assert.strictEqual(usageSampler.calculateCpuPercent({idle: 1250, total: 3000}), 75);
            this.assert.strictEqual(usageSampler.calculateCpuPercent({idle: 1000, total: 2000}), 0);
        });
    }

    async testTheGameServerShutdownStopsTheMonitor()
    {
        await this.test('the game server shutdown clears the checks interval and disables the sampler', async () => {
            let usageSampler = new ServerUsageSampler();
            let monitor = new ServerHealthMonitor(this.defaultLimits, usageSampler);
            monitor.start();
            GameServer.prototype.runOnShutDown.call({shutdownCallbacks: [() => monitor.stop()]});
            this.assert.strictEqual(monitor.checkTimer, false);
            this.assert.strictEqual(usageSampler.eventLoopDelayHistogram.enable(), true);
            usageSampler.eventLoopDelayHistogram.disable();
        });
    }

    async testTheRestartStopsThePreviousMonitor()
    {
        await this.test('the server health of a restarted server stops the previous monitor', async () => {
            let previousSampler = new ServerUsageSampler();
            let previousMonitor = new ServerHealthMonitor(this.defaultLimits, previousSampler);
            previousMonitor.start();
            let serverManager = {
                serverHealthMonitor: previousMonitor,
                configManager: {getWithoutLogs: (path, defaultValue) => defaultValue},
                loginManager: {expiringHmacToken: {}},
                roomsManager: {isRoomCreated: () => false, createdInstances: {}},
                gameServer: {shutdownCallbacks: []},
                app: {get: () => true}
            };
            new ServerManagersInitializer(serverManager).initializeServerHealth();
            this.assert.strictEqual(previousMonitor.checkTimer, false);
            this.assert.strictEqual(previousSampler.eventLoopDelayHistogram.enable(), true);
            previousSampler.eventLoopDelayHistogram.disable();
            this.assert.notStrictEqual(serverManager.serverHealthMonitor, previousMonitor);
            this.assert.strictEqual(serverManager.gameServer.shutdownCallbacks.length, 1);
            serverManager.gameServer.shutdownCallbacks.pop()();
            this.assert.strictEqual(serverManager.serverHealthMonitor.checkTimer, false);
        });
    }

    async testTheEnvironmentLimitsAcceptZero()
    {
        await this.test('the environment variables set the percent limits and can disable them with 0', async () => {
            let healthConfig = this.readHealthEnvironment({
                RELDENS_HEALTH_BLOCKING_ENABLED: '0',
                RELDENS_HEALTH_CHECK_INTERVAL_MS: '2000',
                RELDENS_HEALTH_MAX_MEMORY_PERCENT: '80',
                RELDENS_HEALTH_MAX_CPU_PERCENT: '0',
                RELDENS_HEALTH_MAX_EVENT_LOOP_DELAY_MS: '250',
                RELDENS_HEALTH_REMOTE_STATUS_TIMEOUT_MS: '1500'
            });
            this.assert.deepStrictEqual(healthConfig, {
                blockingEnabled: false,
                checkIntervalMs: 2000,
                maxMemoryPercent: 80,
                maxCpuPercent: 0,
                maxEventLoopDelayMs: 250,
                remoteStatusTimeoutMs: 1500
            });
        });
    }

}

module.exports.TestServerHealthMonitor = TestServerHealthMonitor;
