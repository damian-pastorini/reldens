/**
 *
 * Reldens - Test Remote Servers Status
 *
 */

const { BaseTest } = require('./base-test');
const { RemoteServersStatus } = require('../lib/game/server/health/remote-servers-status');
const { ServerStatusRoute } = require('../lib/game/server/health/server-status-route');
const { ExpiringHmacToken } = require('../lib/game/server/expiring-hmac-token');
const { GameConst } = require('../lib/game/constants');

class TestRemoteServersStatus extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.remoteServerUrl = 'http://localhost:8090';
        this.remoteUsageReport = {
            blockingEnabled: true,
            isOverloaded: true,
            isBlocking: true,
            exceededLimits: ['maxMemoryPercent'],
            limits: {maxMemoryPercent: 90, maxCpuPercent: 90, maxEventLoopDelayMs: 1000},
            usage: {memoryPercent: 94.2}
        };
    }

    createRemoteServerFetch(remoteSecret, requestedUrls)
    {
        return async (requestUrl) => {
            requestedUrls.push(requestUrl);
            let routeResponse = {statusCode: 200, body: false};
            let res = {
                status: (statusCode) => {
                    routeResponse.statusCode = statusCode;
                    return res;
                },
                json: (body) => routeResponse.body = body
            };
            let serverStatusRoute = new ServerStatusRoute({
                serverHealthMonitor: {usageReport: this.remoteUsageReport},
                expiringHmacToken: new ExpiringHmacToken({secret: remoteSecret})
            });
            serverStatusRoute.handle({query: {token: new URL(requestUrl).searchParams.get('token')}, ip: ''}, res);
            return {
                ok: 200 === routeResponse.statusCode,
                status: routeResponse.statusCode,
                json: async () => routeResponse.body
            };
        };
    }

    createRemoteServersStatus(localSecret, fetchCallback)
    {
        return new RemoteServersStatus({
            expiringHmacToken: new ExpiringHmacToken({secret: localSecret}),
            timeoutMs: 3000,
            cacheMs: 5000,
            fetchCallback
        });
    }

    async testTheSignedRequestReturnsTheRemoteUsageReport()
    {
        await this.test('the status signed with the shared secret returns the remote usage report', async () => {
            let requestedUrls = [];
            let remoteServersStatus = this.createRemoteServersStatus(
                'shared-secret',
                this.createRemoteServerFetch('shared-secret', requestedUrls)
            );
            let serverStatus = await remoteServersStatus.fetchStatus(this.remoteServerUrl);
            this.assert.strictEqual(serverStatus.isReachable, true);
            this.assert.strictEqual(serverStatus.isSelf, false);
            this.assert.strictEqual(serverStatus.error, '');
            this.assert.deepStrictEqual(serverStatus.usageReport, this.remoteUsageReport);
            this.assert.strictEqual(
                0,
                [...requestedUrls].shift().indexOf(this.remoteServerUrl+GameConst.ROUTE_PATHS.SERVER_STATUS+'?token=')
            );
        });
    }

    async testTheRequestSignedWithAnotherSecretIsRejected()
    {
        await this.test('the status signed with a different secret is rejected and the server is not reachable', async () => {
            let remoteServersStatus = this.createRemoteServersStatus(
                'local-secret',
                this.createRemoteServerFetch('remote-secret', [])
            );
            let serverStatus = await remoteServersStatus.fetchStatus(this.remoteServerUrl);
            this.assert.strictEqual(serverStatus.isReachable, false);
            this.assert.strictEqual(serverStatus.usageReport, false);
            this.assert.strictEqual(serverStatus.error, 'Status request failed with status 403.');
        });
    }

    async testTheRequestErrorMakesTheServerNotReachable()
    {
        await this.test('a status request that fails or times out makes the server not reachable', async () => {
            let remoteServersStatus = this.createRemoteServersStatus(
                'shared-secret',
                () => Promise.reject({message: 'The operation was aborted due to timeout'})
            );
            let serverStatus = await remoteServersStatus.fetchStatus(this.remoteServerUrl);
            this.assert.strictEqual(serverStatus.isReachable, false);
            this.assert.strictEqual(serverStatus.error, 'Status request error: The operation was aborted due to timeout');
        });
    }

    async testTheStatusIsNotRequestedWithoutTheSecret()
    {
        await this.test('the status is not requested when the signed tokens secret is empty', async () => {
            let requestedUrls = [];
            let remoteServersStatus = this.createRemoteServersStatus(
                '',
                this.createRemoteServerFetch('shared-secret', requestedUrls)
            );
            let serverStatus = await remoteServersStatus.fetchStatus(this.remoteServerUrl);
            this.assert.strictEqual(serverStatus.isReachable, false);
            this.assert.strictEqual(requestedUrls.length, 0);
        });
    }

    async testTheStatusIsCachedForTheCacheTime()
    {
        await this.test('the status of a server is requested once within the cache time', async () => {
            let requestedUrls = [];
            let remoteServersStatus = this.createRemoteServersStatus(
                'shared-secret',
                this.createRemoteServerFetch('shared-secret', requestedUrls)
            );
            await Promise.all([
                remoteServersStatus.fetchStatus(this.remoteServerUrl),
                remoteServersStatus.fetchStatus(this.remoteServerUrl)
            ]);
            await remoteServersStatus.fetchStatus(this.remoteServerUrl);
            this.assert.strictEqual(requestedUrls.length, 1);
        });
    }

}

module.exports.TestRemoteServersStatus = TestRemoteServersStatus;
