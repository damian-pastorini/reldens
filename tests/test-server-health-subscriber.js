/**
 *
 * Reldens - Test Server Health Subscriber
 *
 */

const { BaseTest } = require('./base-test');
const { ServerHealthSubscriber } = require('../lib/admin/server/subscribers/server-health-subscriber');
const { TemplatesList } = require('../lib/admin/server/templates-list');
const { FileHandler } = require('@reldens/server-utils');

class TestServerHealthSubscriber extends BaseTest
{

    loadAdminTemplates()
    {
        let templatesPath = FileHandler.joinPaths(process.cwd(), 'theme', 'admin', 'templates');
        let adminFilesContents = {};
        for(let templateKey of ['serverUsage', 'dashboard', 'management']){
            adminFilesContents[templateKey] = FileHandler.fetchFileContents(
                FileHandler.joinPaths(templatesPath, TemplatesList[templateKey])
            );
        }
        return adminFilesContents;
    }

    async sendUsageRequest(roomsAvailability)
    {
        let capturedRoutes = {};
        let sentResponses = [];
        let subscriber = new ServerHealthSubscriber(
            {events: {on: () => true}, router: {isAuthenticated: (req, res, next) => next()}, adminFilesContents: {}},
            roomsAvailability
        );
        subscriber.setupRoute({get: (path, isAuthenticated, callback) => capturedRoutes[path] = callback});
        await capturedRoutes['/server-health/usage']({}, {json: (responseData) => sentResponses.push(responseData)});
        return sentResponses;
    }

    async testTheServerUsageBlockIsFilledIntoTheDashboardAndTheControlPanel()
    {
        await this.test('the server usage block is filled into the dashboard and the control panel templates', async () => {
            let adminFilesContents = this.loadAdminTemplates();
            let serverUsage = adminFilesContents.serverUsage;
            new ServerHealthSubscriber(
                {events: {on: () => true}, router: {isAuthenticated: (req, res, next) => next()}, adminFilesContents},
                false
            );
            this.assert.strictEqual(adminFilesContents.dashboard.includes(serverUsage), true);
            this.assert.strictEqual(adminFilesContents.dashboard.includes('{{&serverUsage}}'), false);
            this.assert.strictEqual(adminFilesContents.management.includes(serverUsage), true);
            this.assert.strictEqual(adminFilesContents.management.includes('{{&serverUsage}}'), false);
        });
    }

    async testTheUsageRouteSendsEveryServerStatus()
    {
        await this.test('the usage route sends the status of this server and of the other servers', async () => {
            let serversStatuses = [
                {serverUrl: 'http://localhost:8080', isSelf: true, isReachable: true, latencyMs: 0, error: ''},
                {
                    serverUrl: 'http://localhost:8090',
                    isSelf: false,
                    isReachable: false,
                    latencyMs: 3001,
                    usageReport: false,
                    error: 'Status request error: The operation was aborted due to timeout'
                }
            ];
            let sentResponses = await this.sendUsageRequest({fetchServersStatuses: async () => serversStatuses});
            this.assert.deepStrictEqual(sentResponses, [{servers: serversStatuses}]);
        });
    }

    async testTheUsageRouteSendsAnErrorWithoutTheMonitor()
    {
        await this.test('the usage route sends an error when the rooms availability is not available', async () => {
            this.assert.deepStrictEqual(await this.sendUsageRequest(false), [{error: true}]);
        });
    }

}

module.exports.TestServerHealthSubscriber = TestServerHealthSubscriber;
