/**
 *
 * Reldens - Test Player Subscriber
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { PlayerSubscriber } = require('../lib/inventory/server/subscribers/player-subscriber');
const { ItemsConst } = require('@reldens/items-system');
const { EventsManager } = require('@reldens/utils');

class TestPlayerSubscriber extends BaseTest
{

    createSetup()
    {
        let room = {config: GameplayPlayerBuilder.createConfig({
            'inventory/groups/groupBaseData': {weapon: {key: 'weapon'}}
        })};
        room.config.inventory = {items: {}};
        return {
            room,
            events: new EventsManager(),
            client: GameplayPlayerBuilder.createClient(),
            currentPlayer: {player_id: 7, sessionId: 'session-7'},
            modelsManager: {dataServer: {initialized: true}, loadOwnerItems: async () => []}
        };
    }

    async createInventory(setup)
    {
        await PlayerSubscriber.createPlayerInventory(
            setup.client,
            setup.currentPlayer,
            setup.room,
            setup.events,
            setup.modelsManager
        );
    }

    async testGroupsDataIsSentBetweenTheInventoryEvents()
    {
        await this.test('the groups data is sent after the before send event and before the after event', async () => {
            let setup = this.createSetup();
            let calls = [];
            let afterEventData = {};
            setup.events.on('reldens.createPlayerInventoryBeforeSend', (eventData) => {
                calls.push('before:'+setup.client.sentMessages.length);
                eventData.sendData.groups = {custom: {key: 'custom'}};
            });
            setup.events.on('reldens.createPlayerInventoryAfter', (eventData) => {
                calls.push('after:'+setup.client.sentMessages.length);
                afterEventData = eventData;
            });
            await this.createInventory(setup);
            this.assert.deepStrictEqual(calls, ['before:0', 'after:1']);
            this.assert.strictEqual(afterEventData.playerSchema, setup.currentPlayer);
            this.assert.strictEqual(afterEventData.inventoryServer, setup.currentPlayer.inventory);
            this.assert.deepStrictEqual(setup.client.sentMessages, [
                {act: ItemsConst.ACTION_SET_GROUPS, owner: 7, groups: {custom: {key: 'custom'}}}
            ]);
        });
    }

    async testConfiguredGroupsAreSentWithoutListeners()
    {
        await this.test('the configured groups data is sent when no listener changes it', async () => {
            let setup = this.createSetup();
            await this.createInventory(setup);
            this.assert.deepStrictEqual(setup.client.sentMessages, [
                {act: ItemsConst.ACTION_SET_GROUPS, owner: 7, groups: {weapon: {key: 'weapon'}}}
            ]);
        });
    }

}

module.exports.TestPlayerSubscriber = TestPlayerSubscriber;
