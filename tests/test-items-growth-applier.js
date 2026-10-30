/**
 *
 * Reldens - Test Items Growth Applier
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ItemsGrowthApplier } = require('../lib/inventory/server/items-growth-applier');
const { MessageFactory } = require('../lib/chat/message-factory');
const { ChatConst } = require('../lib/chat/constants');
const { ItemsEvents } = require('@reldens/items-system');
const { SkillsEvents } = require('@reldens/skills');
const { ModifierConst } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');

class TestItemsGrowthApplier extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.growingItemId = 12;
    }

    createRepository(storedRows)
    {
        let repository = {storedRows, loads: [], updates: []};
        repository.load = async (filters) => {
            repository.loads.push(filters.id.value);
            return repository.storedRows.filter(row => -1 !== filters.id.value.indexOf(row.id));
        };
        repository.updateById = async (id, data) => {
            repository.updates.push({id, data});
            return true;
        };
        return repository;
    }

    createGrowingItem(props = {})
    {
        let equipCalls = [];
        let growingItem = GameplayPlayerBuilder.createItem('growing_sword', Object.assign({
            id: this.growingItemId,
            label: 'Growing Sword',
            equipped: true,
            equipCalls,
            growth: {
                experienceShare: 50,
                modifiersIncreasePercentPerLevel: 50,
                requireEquipped: true,
                levels: {'2': 5, '3': 30}
            },
            modifiers: {
                attack: {operation: ModifierConst.OPS.INC, originalValue: 10, value: 10},
                setter: {operation: ModifierConst.OPS.SET, originalValue: 3, value: 3}
            }
        }, props));
        growingItem.equip = async () => {
            equipCalls.push('equip');
            growingItem.equipped = true;
        };
        growingItem.unequip = async () => {
            equipCalls.push('unequip');
            growingItem.equipped = false;
        };
        return growingItem;
    }

    createSetup(items, storedRows)
    {
        let repository = this.createRepository(storedRows);
        let itemsGrowthApplier = new ItemsGrowthApplier({dataServer: {getEntity: () => repository}});
        let inventoryManager = GameplayPlayerBuilder.createInventoryManager(items);
        let classPath = {listenedEvents: {}};
        classPath.listenEvent = (eventName, callback) => classPath.listenedEvents[eventName] = callback;
        classPath.getOwnerUniqueEventKey = (suffix) => 'player-7-'+suffix;
        classPath.getOwnerEventKey = () => 'player-7';
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
        playerSchema.skillsServer = {classPath};
        let client = {sentMessages: []};
        client.send = (data) => client.sentMessages.push(data);
        playerSchema.inventory = {manager: inventoryManager, client: {client}};
        return {
            repository,
            itemsGrowthApplier,
            inventoryManager,
            classPath,
            playerSchema,
            client,
            event: {inventoryServer: {manager: inventoryManager}, playerSchema}
        };
    }

    async testPlayerWithoutInventoryIsNotHandled()
    {
        await this.test('a player without inventory manager is not handled', async () => {
            let setup = this.createSetup({}, []);
            let withoutInventoryEvent = {playerSchema: setup.playerSchema};
            let result = await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(withoutInventoryEvent);
            this.assert.strictEqual(result, false);
            this.assert.deepStrictEqual(setup.repository.loads, []);
        });
    }

    async testStoredLevelScalesTheModifiersOnJoin()
    {
        await this.test('the stored level scales the growing item modifiers and the events are listened', async () => {
            let growingItem = this.createGrowingItem();
            let storedRow = {id: this.growingItemId, customData: '{"growth":{"level":2,"experience":12}}'};
            let setup = this.createSetup({growing_sword: growingItem}, [storedRow]);
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), true);
            this.assert.deepStrictEqual(setup.repository.loads, [[this.growingItemId]]);
            this.assert.strictEqual(growingItem.growthLevel, 2);
            this.assert.strictEqual(growingItem.growthExperience, 12);
            this.assert.strictEqual(growingItem.modifiers.attack.value, 15);
            this.assert.strictEqual(growingItem.modifiers.setter.value, 3);
            this.assert.deepStrictEqual(Object.keys(setup.inventoryManager.listenedEvents), [ItemsEvents.ADD_ITEM]);
            this.assert.deepStrictEqual(
                Object.keys(setup.classPath.listenedEvents),
                [SkillsEvents.LEVEL_EXPERIENCE_ADDED]
            );
        });
    }

    async testItemWithoutStoredGrowthStartsAtTheFirstLevel()
    {
        await this.test('a growing item without stored growth data starts at the first level', async () => {
            let growingItem = this.createGrowingItem();
            let setup = this.createSetup({growing_sword: growingItem}, [{id: this.growingItemId, customData: null}]);
            await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event);
            this.assert.strictEqual(growingItem.growthLevel, 1);
            this.assert.strictEqual(growingItem.growthExperience, 0);
            this.assert.strictEqual(growingItem.modifiers.attack.value, 10);
        });
    }

    async testInventoryWithoutGrowingItemsLoadsNoRows()
    {
        await this.test('an inventory without growing items loads no stored rows', async () => {
            let setup = this.createSetup({potion: GameplayPlayerBuilder.createItem('potion')}, []);
            this.assert.strictEqual(await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event), false);
            this.assert.deepStrictEqual(setup.repository.loads, []);
        });
    }

    async testNewGrowingItemStartsAtTheFirstLevel()
    {
        await this.test('a new growing item starts at the first level and other new items are ignored', async () => {
            let setup = this.createSetup({}, []);
            let potion = GameplayPlayerBuilder.createItem('potion');
            this.assert.strictEqual(setup.itemsGrowthApplier.initializeAddedItem(potion), false);
            let growingItem = this.createGrowingItem();
            growingItem.modifiers.attack.value = 99;
            this.assert.strictEqual(setup.itemsGrowthApplier.initializeAddedItem(growingItem), true);
            this.assert.strictEqual(growingItem.growthLevel, 1);
            this.assert.strictEqual(growingItem.growthExperience, 0);
            this.assert.deepStrictEqual(growingItem.inventoryCustomData, {});
            this.assert.strictEqual(growingItem.modifiers.attack.value, 10);
        });
    }

    async testEquippedItemStoresItsExperienceShare()
    {
        await this.test('an equipped growing item receives and stores its experience share', async () => {
            let growingItem = this.createGrowingItem({growthLevel: 1, growthExperience: 0});
            let setup = this.createSetup({growing_sword: growingItem}, []);
            this.assert.strictEqual(await setup.itemsGrowthApplier.addOwnerExperience(setup.playerSchema, 4), 1);
            this.assert.strictEqual(growingItem.growthExperience, 2);
            this.assert.strictEqual(growingItem.growthLevel, 1);
            this.assert.deepStrictEqual(setup.repository.updates, [{
                id: this.growingItemId,
                data: {customData: sc.toJsonString({growth: {level: 1, experience: 2}})}
            }]);
            this.assert.deepStrictEqual(growingItem.equipCalls, []);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
        });
    }

    async testLevelUpReequipsTheItemAndTellsTheOwner()
    {
        await this.test('a growing item level up is equipped again with the scaled modifiers', async () => {
            let growingItem = this.createGrowingItem({growthLevel: 1, growthExperience: 4});
            let setup = this.createSetup({growing_sword: growingItem}, []);
            this.assert.strictEqual(await setup.itemsGrowthApplier.addOwnerExperience(setup.playerSchema, 10), 1);
            this.assert.strictEqual(growingItem.growthLevel, 2);
            this.assert.strictEqual(growingItem.growthExperience, 9);
            this.assert.deepStrictEqual(growingItem.equipCalls, ['unequip', 'equip']);
            this.assert.strictEqual(growingItem.equipped, true);
            this.assert.strictEqual(growingItem.modifiers.attack.value, 15);
            this.assert.strictEqual(growingItem.modifiers.setter.value, 3);
            this.assert.deepStrictEqual(
                setup.client.sentMessages,
                [MessageFactory.create(ChatConst.TYPES.SYSTEM, 'Growing Sword reached level 2.')]
            );
            this.assert.deepStrictEqual(
                setup.repository.updates.map(update => update.data.customData),
                [sc.toJsonString({growth: {level: 2, experience: 9}})]
            );
        });
    }

    async testUnequippedItemGrowsOnlyWithoutTheEquipmentRule()
    {
        await this.test('an unequipped growing item grows only when it does not require the equipment', async () => {
            let requiredItem = this.createGrowingItem({equipped: false, growthLevel: 1, growthExperience: 0});
            let requiredSetup = this.createSetup({growing_sword: requiredItem}, []);
            let requiredApplier = requiredSetup.itemsGrowthApplier;
            this.assert.strictEqual(await requiredApplier.addOwnerExperience(requiredSetup.playerSchema, 10), 0);
            this.assert.strictEqual(requiredItem.growthExperience, 0);
            this.assert.deepStrictEqual(requiredSetup.repository.updates, []);
            let freeItem = this.createGrowingItem({equipped: false, growthLevel: 1, growthExperience: 0});
            freeItem.growth.requireEquipped = false;
            let freeSetup = this.createSetup({growing_sword: freeItem}, []);
            let freeApplier = freeSetup.itemsGrowthApplier;
            this.assert.strictEqual(await freeApplier.addOwnerExperience(freeSetup.playerSchema, 10), 1);
            this.assert.strictEqual(freeItem.growthLevel, 2);
            this.assert.deepStrictEqual(freeItem.equipCalls, []);
            this.assert.strictEqual(freeItem.equipped, false);
        });
    }

    async testNoExperienceOrInventoryGivesNoGrowth()
    {
        await this.test('no experience or a player without inventory gives no growth', async () => {
            let growingItem = this.createGrowingItem({growthLevel: 1, growthExperience: 0});
            let setup = this.createSetup({growing_sword: growingItem}, []);
            this.assert.strictEqual(await setup.itemsGrowthApplier.addOwnerExperience(setup.playerSchema, 0), 0);
            this.assert.strictEqual(await setup.itemsGrowthApplier.addOwnerExperience({}, 10), 0);
            this.assert.strictEqual(growingItem.growthExperience, 0);
            this.assert.deepStrictEqual(setup.repository.updates, []);
        });
    }

}

module.exports.TestItemsGrowthApplier = TestItemsGrowthApplier;
