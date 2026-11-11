/**
 *
 * Reldens - Test Items Growth Applier Failures
 *
 */

const { BaseTest } = require('./base-test');
const { ItemsGrowthApplierBuilder } = require('./fixtures/items-growth-applier-builder');
const { InventoryMessageActions } = require('../lib/inventory/server/message-actions');
const { ItemsConst, ItemsEvents } = require('@reldens/items-system');
const { sc } = require('@reldens/utils');

class TestItemsGrowthApplierFailures extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new ItemsGrowthApplierBuilder();
    }

    async testInvalidStoredCustomDataStartsAtTheFirstLevel()
    {
        await this.test('a growing item with an invalid stored custom data starts at the first level', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.invalidJson]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), true);
            this.assert.strictEqual(sword.growthLevel, 1);
            this.assert.strictEqual(sword.growthExperience, 0);
            this.assert.deepStrictEqual(sword.inventoryCustomData, {});
            this.assert.deepStrictEqual(setup.updatedItems, [{
                key: 'growing_sword',
                customData: {modifiersDisplay: this.builder.firstLevelModifiers, growthLevel: 1}
            }]);
        });
    }

    async testSavedGrowthKeepsTheOtherStoredCustomData()
    {
        await this.test('the saved growth keeps the other data stored in the item custom data', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.withOtherData]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager, {equipped: true});
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event);
            this.assert.strictEqual(await setup.addPlayerExperience(4), 1);
            this.assert.deepStrictEqual(setup.repository.updates, [{
                id: this.builder.growingItemId,
                data: {customData: sc.toJsonString({growth: {level: 1, experience: 2}, enchantment: 'fire'})}
            }]);
        });
    }

    async testFailedLoadDoesNotShareTheExperience()
    {
        await this.test('a failed stored growth load rejects and never shares the player experience', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.levelTwo]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            let loadError = new Error('Stored growth load failed.');
            setup.repository.load = async () => {
                throw loadError;
            };
            await this.assert.rejects(setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), loadError);
            this.assert.deepStrictEqual(setup.classPath.listenedEvents, {});
            this.assert.strictEqual(sc.hasOwn(sword, 'growthLevel'), false);
            this.assert.deepStrictEqual(setup.updatedItems, []);
            this.assert.deepStrictEqual(setup.repository.updates, []);
        });
    }

    async testLoadWithoutRowsSendsNoUpdate()
    {
        await this.test('a stored growth load without rows initializes no item and sends no update', async () => {
            let setup = this.builder.createSetup([]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            setup.repository.load = async () => null;
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), true);
            this.assert.strictEqual(sc.hasOwn(sword, 'growthLevel'), false);
            this.assert.deepStrictEqual(setup.updatedItems, []);
        });
    }

    async testFailedSaveKeepsTheExperienceAndTheError()
    {
        await this.test('a failed growth save keeps the added experience and stores the error', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.levelOne]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager, {equipped: true});
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event);
            let saveError = new Error('Growth save failed.');
            setup.repository.updateById = async () => {
                throw saveError;
            };
            this.assert.strictEqual(await setup.addPlayerExperience(4), 1);
            this.assert.strictEqual(sword.growthExperience, 2);
            this.assert.deepStrictEqual(sword.inventoryCustomData, {growth: {level: 1, experience: 2}});
            this.assert.strictEqual(setup.inventoryManager.lastError.code, ItemsConst.ERROR_CODES.GROWTH.STEP_FAILED);
            this.assert.deepStrictEqual(
                setup.inventoryManager.lastError.data,
                {itemUid: sword.getInventoryId(), stepName: ItemsEvents.GROWTH_EXPERIENCE_ADDED}
            );
            this.assert.strictEqual(setup.inventoryManager.lastError.withError, saveError);
        });
    }

    async testFailedReachedLevelMessageStillEquipsTheGrownItem()
    {
        await this.test('a failed level reached message still sends, equips and stores the grown item', async () => {
            let setup = await this.builder.createEquippedSwordSetup(this.builder.storedRows.nearLevelTwo);
            let sendError = new Error('Chat send failed.');
            setup.chatClient.send = () => {
                throw sendError;
            };
            this.assert.strictEqual(await setup.addPlayerExperience(10), 1);
            this.assert.strictEqual(setup.sword.growthLevel, 2);
            this.assert.strictEqual(setup.sword.equipped, true);
            this.assert.strictEqual(setup.playerSchema.stats.atk, 115);
            this.assert.deepStrictEqual(
                setup.updatedItems.map(updatedItem => updatedItem.customData),
                [
                    {modifiersDisplay: this.builder.firstLevelModifiers, growthLevel: 1},
                    {modifiersDisplay: this.builder.secondLevelModifiers, growthLevel: 2}
                ]
            );
            this.assert.deepStrictEqual(
                setup.repository.updates.map(update => update.data.customData),
                [sc.toJsonString({growth: {level: 2, experience: 9}})]
            );
            this.assert.deepStrictEqual(
                setup.inventoryManager.lastError.data,
                {itemUid: setup.sword.getInventoryId(), stepName: ItemsEvents.GROWTH_LEVEL_UP}
            );
            this.assert.strictEqual(setup.inventoryManager.lastError.withError, sendError);
        });
    }

    async testEquipToggleDuringTheLevelUpUnequipsTheGrownItem()
    {
        await this.test('an equip toggle sent during the level up unequips the item after the level up', async () => {
            let setup = await this.builder.createEquippedSwordSetup(this.builder.storedRows.nearLevelTwo);
            let togglesDuringLevelUp = [];
            setup.inventoryManager.listenEvent(ItemsEvents.GROWTH_LEVEL_UP, () => togglesDuringLevelUp.push(
                new InventoryMessageActions().executeEquipAction(setup.playerSchema, {'idx': setup.sword.getInventoryId()})
            ), 'toggleDuringLevelUp');
            this.assert.strictEqual(await setup.addPlayerExperience(10), 1);
            this.assert.deepStrictEqual(await Promise.all(togglesDuringLevelUp), [true]);
            this.assert.strictEqual(setup.sword.growthLevel, 2);
            this.assert.strictEqual(setup.sword.equipped, false);
            this.assert.strictEqual(setup.playerSchema.stats.atk, 100);
        });
    }

}

module.exports.TestItemsGrowthApplierFailures = TestItemsGrowthApplierFailures;
