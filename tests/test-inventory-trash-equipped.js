/**
 *
 * Reldens - Test Inventory Trash Equipped
 *
 * Tests the trash message with the inventory manager stubbed: an equipped item is unequipped (after its pending growth)
 * before its removal, so its modifiers and equip effects are reverted; with the inventory locked by a trade the item
 * stays equipped and its removal is refused by the manager; and an unequipped item is only removed.
 *
 */

const { BaseTest } = require('./base-test');
const { InventoryMessageActions } = require('../lib/inventory/server/message-actions');
const { InventoryConst } = require('../lib/inventory/constants');

class TestInventoryTrashEquipped extends BaseTest
{

    createPlayer(isEquipped, isLocked)
    {
        let trashSteps = [];
        let item = {equipped: isEquipped, pendingGrowth: Promise.resolve(true)};
        item.unequip = async () => {
            trashSteps.push('unequip');
            item.equipped = false;
        };
        let manager = {items: {'axe-1': item}, locked: isLocked};
        manager.removeItem = async (itemKey) => {
            trashSteps.push(manager.locked ? 'refused '+itemKey : 'removed '+itemKey);
            return !manager.locked;
        };
        return {item, trashSteps, playerSchema: {player_id: 1, inventory: {manager}}};
    }

    async trashItem(player)
    {
        return await new InventoryMessageActions().executeMessageActions(
            {},
            {act: InventoryConst.ACTIONS.REMOVE, 'idx': 'axe-1'},
            {},
            player.playerSchema
        );
    }

    async testATrashedEquippedItemIsUnequippedFirst()
    {
        await this.test('a trashed equipped item is unequipped before its removal', async () => {
            let player = this.createPlayer(true, false);
            await this.trashItem(player);
            this.assert.deepStrictEqual(player.trashSteps, ['unequip', 'removed axe-1']);
            this.assert.strictEqual(player.item.equipped, false);
        });
    }

    async testALockedInventoryKeepsTheItemEquipped()
    {
        await this.test('a trash with the inventory locked keeps the item equipped and is refused', async () => {
            let player = this.createPlayer(true, true);
            await this.trashItem(player);
            this.assert.deepStrictEqual(player.trashSteps, ['refused axe-1']);
            this.assert.strictEqual(player.item.equipped, true);
        });
    }

    async testATrashedUnequippedItemIsOnlyRemoved()
    {
        await this.test('a trashed unequipped item is only removed', async () => {
            let player = this.createPlayer(false, false);
            await this.trashItem(player);
            this.assert.deepStrictEqual(player.trashSteps, ['removed axe-1']);
        });
    }

}

module.exports.TestInventoryTrashEquipped = TestInventoryTrashEquipped;
