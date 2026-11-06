/**
 *
 * Reldens - Test Items Growth Applier
 *
 */

const { BaseTest } = require('./base-test');
const { ItemsGrowthApplierBuilder } = require('./fixtures/items-growth-applier-builder');
const { MessageFactory } = require('../lib/chat/message-factory');
const { ChatConst } = require('../lib/chat/constants');
const { InventoryConst } = require('../lib/inventory/constants');
const { ItemBase } = require('@reldens/items-system');
const { SkillsEvents } = require('@reldens/skills');
const { sc } = require('@reldens/utils');

class TestItemsGrowthApplier extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new ItemsGrowthApplierBuilder();
    }

    async testPlayerWithoutInventoryIsNotHandled()
    {
        await this.test('a player without inventory manager is not handled', async () => {
            let setup = this.builder.createSetup([]);
            let result = await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter({playerSchema: setup.playerSchema});
            this.assert.strictEqual(result, false);
            this.assert.deepStrictEqual(setup.repository.loads, []);
            this.assert.deepStrictEqual(setup.classPath.listenedEvents, {});
        });
    }

    async testStoredLevelIsLoadedAndSentOnJoin()
    {
        await this.test('the stored level scales the growing item modifiers and the item update is sent', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.levelTwo]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), true);
            this.assert.deepStrictEqual(setup.repository.loads, [[this.builder.growingItemId]]);
            this.assert.strictEqual(sword.growthLevel, 2);
            this.assert.strictEqual(sword.growthExperience, 12);
            this.assert.deepStrictEqual(sword.inventoryCustomData, {growth: {level: 2, experience: 12}});
            this.assert.strictEqual(sword.modifiers.attack.value, 15);
            this.assert.strictEqual(sword.modifiers.setter.value, 3);
            this.assert.deepStrictEqual(setup.updatedItems, [{
                key: 'growing_sword',
                customData: {modifiersDisplay: this.builder.secondLevelModifiers, growthLevel: 2}
            }]);
            this.assert.deepStrictEqual(
                Object.keys(setup.classPath.listenedEvents),
                [SkillsEvents.LEVEL_EXPERIENCE_ADDED]
            );
            this.assert.deepStrictEqual(setup.repository.updates, []);
        });
    }

    async testItemWithoutStoredGrowthStartsAtTheFirstLevel()
    {
        await this.test('a growing item without stored growth data starts at the first level', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.withoutGrowth]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event);
            this.assert.strictEqual(sword.growthLevel, 1);
            this.assert.strictEqual(sword.growthExperience, 0);
            this.assert.deepStrictEqual(sword.inventoryCustomData, {});
            this.assert.strictEqual(sword.modifiers.attack.value, 10);
            this.assert.deepStrictEqual(setup.updatedItems, [{
                key: 'growing_sword',
                customData: {modifiersDisplay: this.builder.firstLevelModifiers, growthLevel: 1}
            }]);
        });
    }

    async testOnlyTheGrowingItemsWithStoredRowsAreLoaded()
    {
        await this.test('the growing items without id or without stored row and the other items are not loaded', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.levelTwo]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            let deletedSword = this.builder.createGrowingSword(setup.inventoryManager, {id: 13, uid: 'deleted_sword'});
            let unsavedSword = this.builder.createGrowingSword(setup.inventoryManager, {id: null, uid: 'unsaved_sword'});
            let potion = new ItemBase({key: 'potion', id: 20, manager: setup.inventoryManager});
            await setup.inventoryManager.setItems({sword, deletedSword, unsavedSword, potion});
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), true);
            this.assert.deepStrictEqual(setup.repository.loads, [[this.builder.growingItemId, 13]]);
            this.assert.strictEqual(sword.growthLevel, 2);
            this.assert.strictEqual(sc.hasOwn(deletedSword, 'growthLevel'), false);
            this.assert.strictEqual(sc.hasOwn(unsavedSword, 'growthLevel'), false);
            this.assert.strictEqual(sc.hasOwn(potion, 'growthLevel'), false);
            this.assert.deepStrictEqual(setup.updatedItems.map(updatedItem => updatedItem.key), ['growing_sword']);
        });
    }

    async testInventoryWithoutGrowingItemsLoadsNoRows()
    {
        await this.test('an inventory without growing items loads no stored rows and sends no update', async () => {
            let setup = this.builder.createSetup([]);
            let potion = new ItemBase({key: 'potion', id: 20, manager: setup.inventoryManager});
            await setup.inventoryManager.setItems({potion});
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), false);
            this.assert.deepStrictEqual(setup.repository.loads, []);
            this.assert.deepStrictEqual(setup.updatedItems, []);
            this.assert.deepStrictEqual(
                Object.keys(setup.classPath.listenedEvents),
                [SkillsEvents.LEVEL_EXPERIENCE_ADDED]
            );
        });
    }

    async testNewItemsAreInitializedWhenAdded()
    {
        await this.test('a new growing item starts at the first level and every new item gets its display data', async () => {
            let setup = this.builder.createSetup([]);
            await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event);
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            sword.modifiers.attack.value = 99;
            await setup.inventoryManager.addItem(sword);
            this.assert.strictEqual(sword.growthLevel, 1);
            this.assert.strictEqual(sword.growthExperience, 0);
            this.assert.deepStrictEqual(sword.inventoryCustomData, {});
            this.assert.strictEqual(sword.modifiers.attack.value, 10);
            this.assert.deepStrictEqual(sword.customData, {
                modifiersDisplay: this.builder.firstLevelModifiers,
                growthLevel: 1
            });
            let potion = new ItemBase({key: 'potion', id: 20, manager: setup.inventoryManager});
            await setup.inventoryManager.addItem(potion);
            this.assert.strictEqual(sc.hasOwn(potion, 'growthLevel'), false);
            this.assert.strictEqual(sc.hasOwn(potion, 'inventoryCustomData'), false);
            this.assert.deepStrictEqual(potion.customData, {modifiersDisplay: [], growthLevel: 0});
            this.assert.deepStrictEqual(setup.updatedItems, []);
        });
    }

    async testEquippedItemStoresItsExperienceShare()
    {
        await this.test('an equipped growing item receives and stores its share of the player experience', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.levelOne]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager, {equipped: true});
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event);
            this.assert.strictEqual(await setup.addPlayerExperience(4), 1);
            this.assert.strictEqual(sword.growthExperience, 2);
            this.assert.strictEqual(sword.growthLevel, 1);
            this.assert.deepStrictEqual(setup.repository.updates, [{
                id: this.builder.growingItemId,
                data: {customData: sc.toJsonString({growth: {level: 1, experience: 2}})}
            }]);
            this.assert.deepStrictEqual(setup.chatClient.sentMessages, []);
            this.assert.strictEqual(setup.updatedItems.length, 1);
        });
    }

    async testExperienceIsSharedOnlyAfterTheStoredGrowthIsLoaded()
    {
        await this.test('the player experience is shared only after the stored growth is loaded', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.levelTwo]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager, {equipped: true});
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            let loadStoredRows = setup.repository.load;
            let listenedEventsOnLoad = [];
            setup.repository.load = async (filters) => {
                listenedEventsOnLoad.push(Object.keys(setup.classPath.listenedEvents));
                return await loadStoredRows(filters);
            };
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), true);
            this.assert.deepStrictEqual(listenedEventsOnLoad, [[]]);
            this.assert.deepStrictEqual(
                Object.keys(setup.classPath.listenedEvents),
                [SkillsEvents.LEVEL_EXPERIENCE_ADDED]
            );
            this.assert.strictEqual(await setup.addPlayerExperience(4), 1);
            this.assert.strictEqual(sword.growthLevel, 2);
            this.assert.strictEqual(sword.growthExperience, 14);
            this.assert.deepStrictEqual(
                setup.repository.updates.map(update => update.data.customData),
                [sc.toJsonString({growth: {level: 2, experience: 14}})]
            );
        });
    }

    async testLevelUpSendsTheDisplayDataAndTheReachedLevel()
    {
        await this.test('a level up sends the grown display data and the reached level and stores the growth', async () => {
            let setup = await this.builder.createEquippedSwordSetup(this.builder.storedRows.nearLevelTwo);
            this.assert.strictEqual(setup.playerSchema.stats.atk, 110);
            this.assert.strictEqual(await setup.addPlayerExperience(10), 1);
            this.assert.strictEqual(setup.sword.growthLevel, 2);
            this.assert.strictEqual(setup.sword.growthExperience, 9);
            this.assert.strictEqual(setup.sword.equipped, true);
            this.assert.strictEqual(setup.playerSchema.stats.atk, 115);
            this.assert.deepStrictEqual(setup.updatedItems.map(updatedItem => updatedItem.customData), [
                {modifiersDisplay: this.builder.firstLevelModifiers, growthLevel: 1},
                {modifiersDisplay: this.builder.secondLevelModifiers, growthLevel: 2}
            ]);
            this.assert.deepStrictEqual(setup.chatClient.sentMessages, [
                MessageFactory.create(
                    ChatConst.TYPES.SYSTEM,
                    InventoryConst.SNIPPETS.ITEM_REACHED_LEVEL,
                    {itemLabel: 'Growing Sword', level: 2}
                )
            ]);
            this.assert.deepStrictEqual(
                setup.repository.updates.map(update => update.data.customData),
                [sc.toJsonString({growth: {level: 2, experience: 9}})]
            );
        });
    }

    async testUnequippedItemGrowsOnlyWithoutTheEquipmentRule()
    {
        await this.test('an unequipped growing item grows only when it does not require the equipment', async () => {
            let requiredSetup = this.builder.createSetup([this.builder.storedRows.levelOne]);
            let requiredSword = this.builder.createGrowingSword(requiredSetup.inventoryManager);
            await requiredSetup.inventoryManager.setItems({[requiredSword.getInventoryId()]: requiredSword});
            await requiredSetup.itemsGrowthApplier.onCreatePlayerInventoryAfter(requiredSetup.event);
            this.assert.strictEqual(await requiredSetup.addPlayerExperience(10), 0);
            this.assert.strictEqual(requiredSword.growthExperience, 0);
            this.assert.deepStrictEqual(requiredSetup.repository.updates, []);
            this.assert.deepStrictEqual(requiredSetup.chatClient.sentMessages, []);
            let freeSetup = this.builder.createSetup([this.builder.storedRows.levelOne]);
            let freeSword = this.builder.createGrowingSword(freeSetup.inventoryManager, {
                customData: {growth: Object.assign(sc.deepJsonClone(this.builder.growth), {requireEquipped: false})}
            });
            await freeSetup.inventoryManager.setItems({[freeSword.getInventoryId()]: freeSword});
            await freeSetup.itemsGrowthApplier.onCreatePlayerInventoryAfter(freeSetup.event);
            this.assert.strictEqual(await freeSetup.addPlayerExperience(10), 1);
            this.assert.strictEqual(freeSword.growthLevel, 2);
            this.assert.strictEqual(freeSword.equipped, false);
            this.assert.strictEqual(freeSetup.playerSchema.stats.atk, 100);
            this.assert.deepStrictEqual(
                freeSetup.updatedItems.map(updatedItem => updatedItem.customData.growthLevel),
                [1, 2]
            );
            this.assert.strictEqual(freeSetup.chatClient.sentMessages.length, 1);
            this.assert.strictEqual(freeSetup.repository.updates.length, 1);
        });
    }

    async testNoExperienceGivesNoGrowth()
    {
        await this.test('a zero or negative experience gives no growth, no update and no stored row', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.levelOne]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager, {equipped: true});
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event);
            this.assert.strictEqual(await setup.addPlayerExperience(0), 0);
            this.assert.strictEqual(await setup.addPlayerExperience(-10), 0);
            this.assert.strictEqual(sword.growthExperience, 0);
            this.assert.deepStrictEqual(setup.repository.updates, []);
            this.assert.strictEqual(setup.updatedItems.length, 1);
        });
    }

    async testReachedLevelWithoutClientOnlyUpdatesTheDisplayData()
    {
        await this.test('a reached level without inventory client updates the display data without message', async () => {
            let setup = this.builder.createSetup([]);
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            sword.growthLevel = 2;
            this.assert.strictEqual(setup.itemsGrowthApplier.applyReachedLevel(sword, false), false);
            this.assert.strictEqual(sword.customData.growthLevel, 2);
            this.assert.deepStrictEqual(setup.chatClient.sentMessages, []);
        });
    }

    async testItemWithoutIdIsNotStored()
    {
        await this.test('the growth of an item without id is not stored', async () => {
            let setup = this.builder.createSetup([]);
            let grownProps = {growthLevel: 2, growthExperience: 9};
            let unsavedSword = this.builder.createGrowingSword(setup.inventoryManager, {id: null});
            Object.assign(unsavedSword, grownProps);
            this.assert.strictEqual(await setup.itemsGrowthApplier.saveItemGrowth(unsavedSword), false);
            this.assert.deepStrictEqual(setup.repository.updates, []);
            let sword = Object.assign(this.builder.createGrowingSword(setup.inventoryManager), grownProps);
            this.assert.strictEqual(await setup.itemsGrowthApplier.saveItemGrowth(sword), true);
            this.assert.deepStrictEqual(setup.repository.updates, [{
                id: this.builder.growingItemId,
                data: {customData: sc.toJsonString({growth: {level: 2, experience: 9}})}
            }]);
        });
    }

    async testPlayerWithoutClassPathStillLoadsTheStoredGrowth()
    {
        await this.test('a player without class path still loads the stored growth of its items', async () => {
            let setup = this.builder.createSetup([this.builder.storedRows.levelTwo]);
            setup.playerSchema.skillsServer = {};
            let sword = this.builder.createGrowingSword(setup.inventoryManager);
            await setup.inventoryManager.setItems({[sword.getInventoryId()]: sword});
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), true);
            this.assert.strictEqual(sword.growthLevel, 2);
            this.assert.deepStrictEqual(setup.classPath.listenedEvents, {});
        });
    }

}

module.exports.TestItemsGrowthApplier = TestItemsGrowthApplier;
