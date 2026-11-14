/**
 *
 * Reldens - Test Player Death Equipped Items Drop
 *
 * Tests the droppable items picked on the player death: with server/players/drop/equippedItems on every droppable item
 * can drop, the equipped ones too, with it off the equipped items are never droppable, and an item that can not be
 * dropped is never picked.
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerDeathSubscriber } = require('../lib/inventory/server/subscribers/player-death-subscriber');

class TestPlayerDeathEquippedItemsDrop extends BaseTest
{

    createInventoryItems()
    {
        return {
            sword: {key: 'sword', item_id: 1, canBeDropped: true, equipped: true},
            potion: {key: 'potion', item_id: 2, canBeDropped: true, equipped: false},
            questItem: {key: 'questItem', item_id: 3, canBeDropped: false, equipped: false}
        };
    }

    async fetchDroppableKeys(dropEquippedItems)
    {
        return Object.keys(
            await (new PlayerDeathSubscriber({getEntity: () => ({})}, dropEquippedItems)).fetchDroppableItems(
                this.createInventoryItems()
            )
        );
    }

    async testTheEquippedItemsDropWhenEnabled()
    {
        await this.test('with the equipped items drop on the equipped and unequipped droppable items can drop', async () => {
            this.assert.deepStrictEqual(await this.fetchDroppableKeys(true), ['sword', 'potion']);
        });
    }

    async testADroppedEquippedItemIsRemovedFromTheInventory()
    {
        await this.test('a dropped equipped item is removed through the inventory, which unequips it first', async () => {
            let removedKeys = [];
            let sword = {key: 'sword', item_id: 1, canBeDropped: true, equipped: true};
            let manager = {items: {sword}, locked: false, removeItem: async (itemKey) => removedKeys.push(itemKey)};
            let subscriber = new PlayerDeathSubscriber({getEntity: () => ({})}, true);
            subscriber.loadedAnimations = {1: {}};
            let drops = await subscriber.extractRandomDropItems({inventory: {manager}}, 1);
            this.assert.deepStrictEqual([drops.map(item => item.key), removedKeys], [['sword'], ['sword']]);
        });
    }

    async testTheEquippedItemsAreKeptWhenDisabled()
    {
        await this.test('with the equipped items drop off only the unequipped droppable items can drop', async () => {
            this.assert.deepStrictEqual(await this.fetchDroppableKeys(false), ['potion']);
        });
    }

}

module.exports.TestPlayerDeathEquippedItemsDrop = TestPlayerDeathEquippedItemsDrop;
