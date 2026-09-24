/**
 *
 * Reldens - Test Ip Lists Upgrade Guard
 *
 */

const { BaseTest } = require('./base-test');
const { IpListsUpgradeGuard } = require('../lib/game/server/ip-lists-upgrade-guard');
const { ConfigManager } = require('../lib/config/server/manager');
const { AppServerFactory } = require('@reldens/server-utils');

class TestIpListsUpgradeGuard extends BaseTest
{

    createIpListsUpgradeGuard(ipListsRepository)
    {
        return new IpListsUpgradeGuard({
            configManager: new ConfigManager({
                environmentConfig: {
                    appServerConfig: {ipLists: {enabled: true, allow: [], deny: ['10.0.0.1']}},
                    security: {ipLists: {deny: ['10.0.0.2']}}
                }
            }),
            ipListsConfigurer: new AppServerFactory().ipListsConfigurer,
            ipListsRepository
        });
    }

    async testTheListsJoinTheEnvironmentTheRowsAndThePermanentStoredEntries()
    {
        await this.test('the deny list joins the environment, the rows and the permanent stored entries', async () => {
            let ipListsUpgradeGuard = this.createIpListsUpgradeGuard({loadAll: async () => [
                {address: '10.0.0.3', list_type: 'deny', expires_at: null},
                {address: '10.0.0.4', list_type: 'deny', expires_at: '2099-01-01 00:00:00'}
            ]});
            await ipListsUpgradeGuard.refresh();
            let ipListsConfigurer = ipListsUpgradeGuard.ipListsConfigurer;
            this.assert.strictEqual(ipListsConfigurer.isAllowed('10.0.0.1'), false);
            this.assert.strictEqual(ipListsConfigurer.isAllowed('10.0.0.2'), false);
            this.assert.strictEqual(ipListsConfigurer.isAllowed('10.0.0.3'), false);
            this.assert.strictEqual(ipListsConfigurer.isAllowed('10.0.0.4'), true);
            this.assert.strictEqual(ipListsConfigurer.isAllowed('10.0.0.9'), true);
        });
    }

    async testTheListsAreBuiltWithoutTheIpListsEntity()
    {
        await this.test('the lists are built from the environment and the rows without the entity', async () => {
            let ipListsUpgradeGuard = this.createIpListsUpgradeGuard(false);
            await ipListsUpgradeGuard.refresh();
            this.assert.deepStrictEqual(await ipListsUpgradeGuard.loadStoredEntries(), {allow: [], deny: []});
            this.assert.strictEqual(ipListsUpgradeGuard.ipListsConfigurer.isAllowed('10.0.0.1'), false);
            this.assert.strictEqual(ipListsUpgradeGuard.ipListsConfigurer.isAllowed('10.0.0.2'), false);
        });
    }

    async testTheDeniedAddressWebSocketUpgradeIsRejected()
    {
        await this.test('the WebSocket upgrade of a denied address is answered with a 403 response', async () => {
            let ipListsUpgradeGuard = this.createIpListsUpgradeGuard(false);
            await ipListsUpgradeGuard.refresh();
            let beforeUpgradeHandler = ipListsUpgradeGuard.createBeforeUpgradeHandler();
            this.assert.strictEqual(beforeUpgradeHandler({}, {ip: '10.0.0.1'}).status, 403);
            this.assert.strictEqual(Boolean(beforeUpgradeHandler({}, {ip: '10.0.0.9'})), false);
        });
    }

}

module.exports.TestIpListsUpgradeGuard = TestIpListsUpgradeGuard;
