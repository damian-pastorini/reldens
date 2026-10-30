/**
 *
 * Reldens - Test Items Factory
 *
 */

const { BaseTest } = require('./base-test');
const { ItemsFactory } = require('../lib/inventory/server/items-factory');
const { ItemsManager, ItemsDataGenerator } = require('@reldens/items-system');
const { EventsManager } = require('@reldens/utils');

class TestItemsFactory extends BaseTest
{

    createGrowingSwordModelData()
    {
        return ItemsDataGenerator.itemsListMappedData({}, [{
            id: 12,
            key: 'growing_sword',
            type: 1,
            group_id: 1,
            label: 'Growing Sword',
            related_items_item_modifiers: [
                {id: 6, item_id: 12, key: 'atk', property_key: 'stats/atk', operation: 1, value: '10'}
            ]
        }]);
    }

    createOwnerItem(ownerId, itemsModelData, eventsManager)
    {
        let owner = {id: ownerId, stats: {atk: 100}};
        let manager = new ItemsManager({owner, itemsModelData, eventsManager});
        let item = manager.createItemInstance('growing_sword');
        ItemsFactory.isolateModifiers(item, owner);
        return {owner, item};
    }

    async testEveryNewItemModifiesOnlyItsOwner()
    {
        await this.test('a new item modifies only its own owner when equipped', async () => {
            let itemsModelData = this.createGrowingSwordModelData();
            let eventsManager = new EventsManager();
            let firstOwnerItem = this.createOwnerItem(1, itemsModelData, eventsManager);
            let secondOwnerItem = this.createOwnerItem(2, itemsModelData, eventsManager);
            await firstOwnerItem.item.equip();
            this.assert.strictEqual(firstOwnerItem.owner.stats.atk, 110);
            this.assert.strictEqual(secondOwnerItem.owner.stats.atk, 100);
        });
    }

    async testIsolatedModifiersAreNotTheItemsDataModifiers()
    {
        await this.test('the item modifiers are copies of the items data modifiers', async () => {
            let itemsModelData = this.createGrowingSwordModelData();
            let ownerItem = this.createOwnerItem(1, itemsModelData, new EventsManager());
            let dataModifier = itemsModelData['growing_sword'].data.modifiers[6];
            let itemModifier = ownerItem.item.modifiers[6];
            this.assert.notStrictEqual(itemModifier, dataModifier);
            this.assert.strictEqual(itemModifier.value, dataModifier.value);
            this.assert.strictEqual(itemModifier.target, ownerItem.owner);
        });
    }

}

module.exports.TestItemsFactory = TestItemsFactory;
