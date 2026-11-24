/**
 *
 * Reldens - Test Inventory Equip Queue
 *
 * Tests the equip messages of InventoryMessageActions with the real items manager and an equipped sword of the growth
 * builder: two equip toggles of the same player sent in the same tick run one after the other, so the sword ends
 * equipped again with the attack it had (the first toggle unequips it and the second one equips it back), and an equip
 * that throws answers false without blocking the next equip of that player.
 *
 */

const { BaseTest } = require('./base-test');
const { ItemsGrowthApplierBuilder } = require('./fixtures/items-growth-applier-builder');
const { InventoryMessageActions } = require('../lib/inventory/server/message-actions');
const { InventoryConst } = require('../lib/inventory/constants');

class TestInventoryEquipQueue extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new ItemsGrowthApplierBuilder();
    }

    async testTwoEquipTogglesInTheSameTickRunInOrder()
    {
        await this.test('two equip toggles sent in the same tick run in order and keep the equipped stats', async () => {
            let setup = await this.builder.createEquippedSwordSetup(this.builder.storedRows.nearLevelTwo);
            let equippedAttack = setup.playerSchema.stats.atk;
            let messageActions = new InventoryMessageActions();
            let equipMessage = {act: InventoryConst.ACTIONS.EQUIP, idx: setup.sword.getInventoryId()};
            let results = await Promise.all([
                messageActions.executeMessageActions({}, equipMessage, {}, setup.playerSchema),
                messageActions.executeMessageActions({}, equipMessage, {}, setup.playerSchema)
            ]);
            this.assert.deepStrictEqual(
                [results, setup.sword.equipped, setup.playerSchema.stats.atk],
                [[true, true], true, equippedAttack]
            );
        });
    }

    async testAFailedEquipDoesNotBlockTheNextOne()
    {
        await this.test('an equip that throws answers false and the next equip of the player still runs', async () => {
            let setup = await this.builder.createEquippedSwordSetup(this.builder.storedRows.nearLevelTwo);
            let messageActions = new InventoryMessageActions();
            let equipMessage = {act: InventoryConst.ACTIONS.EQUIP, idx: setup.sword.getInventoryId()};
            let toggleEquip = setup.inventoryManager.toggleEquip.bind(setup.inventoryManager);
            setup.inventoryManager.toggleEquip = async () => {
                setup.inventoryManager.toggleEquip = toggleEquip;
                throw new Error('Equip storage error.');
            };
            let results = await Promise.all([
                messageActions.executeMessageActions({}, equipMessage, {}, setup.playerSchema),
                messageActions.executeMessageActions({}, equipMessage, {}, setup.playerSchema)
            ]);
            this.assert.deepStrictEqual([results, setup.sword.equipped], [[false, true], false]);
        });
    }

}

module.exports.TestInventoryEquipQueue = TestInventoryEquipQueue;
