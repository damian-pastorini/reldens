/**
 *
 * Reldens - Test Player Subscriber
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { PlayerSubscriber } = require('../lib/inventory/server/subscribers/player-subscriber');
const { ItemBase, ItemsConst, ItemsEvents } = require('@reldens/items-system');
const { EventsManager, sc } = require('@reldens/utils');

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

    async testItemsDisplayDataIsSentOnlyWithTheAddAndUpdateMessages()
    {
        await this.test('the items display data is sent only with the item add and update messages', async () => {
            let setup = this.createSetup();
            await this.createInventory(setup);
            let itemsSender = setup.currentPlayer.inventory.client;
            let displayDataActions = [ItemsConst.ACTION_ADD, ItemsConst.ACTION_UPDATE];
            for(let itemAction of Object.keys(itemsSender.sendProperties)){
                this.assert.strictEqual(
                    sc.get(itemsSender.sendProperties[itemAction], 'send', []).includes('customData'),
                    displayDataActions.includes(itemAction)
                );
            }
            let inventoryManager = setup.currentPlayer.inventory.manager;
            let item = new ItemBase({key: 'growing_sword', id: 12, uid: 'growing_sword', manager: inventoryManager});
            item.growthLevel = 2;
            item.growthExperience = 9;
            item.customData = {modifiersDisplay: [], growthLevel: 2};
            await inventoryManager.fireEvent(ItemsEvents.UPDATE_ITEM, item);
            this.assert.deepStrictEqual([...setup.client.sentMessages].pop(), {
                act: ItemsConst.ACTION_UPDATE,
                owner: 7,
                item: {
                    idx: 'growing_sword',
                    id: 12,
                    key: 'growing_sword',
                    growthLevel: 2,
                    growthExperience: 9,
                    customData: {modifiersDisplay: [], growthLevel: 2}
                },
                targetProps: {}
            });
        });
    }

}

module.exports.TestPlayerSubscriber = TestPlayerSubscriber;
