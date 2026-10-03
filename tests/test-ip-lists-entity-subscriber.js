/**
 *
 * Reldens - Test Ip Lists Entity Subscriber
 *
 */

const { BaseTest } = require('./base-test');
const { IpListsEntitySubscriber } = require('../lib/admin/server/subscribers/ip-lists-entity-subscriber');
const { IpListsUpgradeGuard } = require('../lib/game/server/ip-lists-upgrade-guard');
const { ConfigManager } = require('../lib/config/server/manager');
const { AppServerFactory } = require('@reldens/server-utils');
const { EventsManager } = require('@reldens/utils');

class TestIpListsEntitySubscriber extends BaseTest
{

    createSubscriberSetup()
    {
        let subscriberSetup = {
            storedRows: [],
            events: new EventsManager(),
            ipListsConfigurer: new AppServerFactory().ipListsConfigurer
        };
        subscriberSetup.ipListsUpgradeGuard = new IpListsUpgradeGuard({
            configManager: new ConfigManager({
                environmentConfig: {appServerConfig: {ipLists: {enabled: true, allow: [], deny: []}}}
            }),
            ipListsConfigurer: subscriberSetup.ipListsConfigurer,
            ipListsRepository: {loadAll: async () => subscriberSetup.storedRows}
        });
        subscriberSetup.subscriber = new IpListsEntitySubscriber(
            {events: subscriberSetup.events},
            subscriberSetup.ipListsUpgradeGuard
        );
        return subscriberSetup;
    }

    async testTheSavedDenyRowBlocksTheAddressAndTheDeleteAllowsItAgain()
    {
        await this.test('a deny row saved in the admin blocks the address and its delete allows it again', async () => {
            let subscriberSetup = this.createSubscriberSetup();
            await subscriberSetup.ipListsUpgradeGuard.refresh();
            subscriberSetup.storedRows.push({address: '10.0.0.5', list_type: 'deny', expires_at: null});
            let ipListsEvent = {driverResource: {entityKey: 'ipLists'}};
            await subscriberSetup.events.emit('reldens.adminAfterEntitySave', ipListsEvent);
            this.assert.strictEqual(subscriberSetup.ipListsConfigurer.isAllowed('10.0.0.5'), false);
            subscriberSetup.storedRows.pop();
            await subscriberSetup.events.emit('reldens.adminAfterEntityDelete', ipListsEvent);
            this.assert.strictEqual(subscriberSetup.ipListsConfigurer.isAllowed('10.0.0.5'), true);
        });
    }

    async testTheOtherEntitiesDoNotRefreshTheLists()
    {
        await this.test('a save of another entity does not refresh the IP lists', async () => {
            let subscriberSetup = this.createSubscriberSetup();
            await subscriberSetup.ipListsUpgradeGuard.refresh();
            subscriberSetup.storedRows.push({address: '10.0.0.6', list_type: 'deny', expires_at: null});
            await subscriberSetup.events.emit('reldens.adminAfterEntitySave', {driverResource: {entityKey: 'rooms'}});
            this.assert.strictEqual(subscriberSetup.ipListsConfigurer.isAllowed('10.0.0.6'), true);
        });
    }

}

module.exports.TestIpListsEntitySubscriber = TestIpListsEntitySubscriber;
