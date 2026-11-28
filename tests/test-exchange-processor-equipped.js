/**
 *
 * Reldens - Test Exchange Processor Equipped
 *
 * Tests Processor.add with the real items managers and the sword of the growth builder: an equipped item sent to the
 * exchange (a tampered trade add) is refused and stays out of the offer, and the same item unequipped is pushed.
 *
 */

const { BaseTest } = require('./base-test');
const { ItemsGrowthApplierBuilder } = require('./fixtures/items-growth-applier-builder');
const { Processor } = require('../lib/inventory/server/exchange/processor');
const { RequirementsCollection, RewardsCollection } = require('@reldens/items-system');
const { sc } = require('@reldens/utils');

class TestExchangeProcessorEquipped extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new ItemsGrowthApplierBuilder();
    }

    async pushSword(isEquipped)
    {
        let setup = await this.builder.createEquippedSwordSetup(this.builder.storedRows.nearLevelTwo);
        setup.sword.qty = 1;
        if(!isEquipped){
            await setup.inventoryManager.toggleEquip(setup.sword);
        }
        let swordId = setup.sword.getInventoryId();
        let transaction = await Processor.init({
            data: {},
            from: setup.inventoryManager,
            to: this.builder.createSetup([]).inventoryManager,
            exchangeRequirementsA: new RequirementsCollection(),
            exchangeRewardsB: new RewardsCollection()
        });
        let pushResult = await Processor.add({data: {itemId: swordId, qty: 1}, transaction, inventoryKey: 'A'});
        this.lastExchangeError = transaction.lastError;
        return [setup.sword.equipped, pushResult, Object.keys(transaction.exchangeBetween.A)];
    }

    async testAnEquippedItemIsNeverPushedForExchange()
    {
        await this.test('an equipped item sent to the exchange is refused and the unequipped one is pushed', async () => {
            let equippedPush = await this.pushSword(true);
            let unequippedPush = await this.pushSword(false);
            this.assert.deepStrictEqual(
                [equippedPush, unequippedPush.slice(0, 2), unequippedPush[2].length],
                [[true, false, []], [false, true], 1],
                'Last exchange error: '+sc.toJsonString(this.lastExchangeError)
            );
        });
    }

}

module.exports.TestExchangeProcessorEquipped = TestExchangeProcessorEquipped;
