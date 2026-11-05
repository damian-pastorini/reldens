/**
 *
 * Reldens - ItemsGrowthApplierBuilder
 *
 * Builds the items growth setup over the real @reldens/items-system classes: the player schema as the owner of a real
 * items manager, a growing sword with real modifiers over the player stats, the items_inventory repository returning
 * the given stored rows (recording the loads and the updates), the class path recording its listened events, the chat
 * client recording the sent messages and the items updates fired by the manager.
 *
 */

const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { ItemsGrowthApplier } = require('../../lib/inventory/server/items-growth-applier');
const { ItemsManager, ItemEquipment, ItemsEvents } = require('@reldens/items-system');
const { SkillsEvents } = require('@reldens/skills');
const { Modifier, ModifierConst } = require('@reldens/modifiers');
const { EventsManager, sc } = require('@reldens/utils');

class ItemsGrowthApplierBuilder
{

    constructor()
    {
        this.growingItemId = 12;
        this.growth = {
            experienceShare: 50,
            modifiersIncreasePercentPerLevel: 50,
            requireEquipped: true,
            levels: {'2': 5, '3': 30}
        };
        this.storedRows = {
            levelOne: {id: this.growingItemId, customData: sc.toJsonString({growth: {level: 1, experience: 0}})},
            nearLevelTwo: {id: this.growingItemId, customData: sc.toJsonString({growth: {level: 1, experience: 4}})},
            levelTwo: {id: this.growingItemId, customData: sc.toJsonString({growth: {level: 2, experience: 12}})},
            withoutGrowth: {id: this.growingItemId, customData: null},
            invalidJson: {id: this.growingItemId, customData: 'not-a-json'},
            withOtherData: {
                id: this.growingItemId,
                customData: sc.toJsonString({growth: {level: 1, experience: 0}, enchantment: 'fire'})
            }
        };
        this.firstLevelModifiers = [
            {propertyKey: 'stats/atk', operation: ModifierConst.OPS.INC, value: 10, display: '+10 atk'},
            {propertyKey: 'stats/speed', operation: ModifierConst.OPS.SET, value: 3, display: '=3 speed'}
        ];
        this.secondLevelModifiers = [
            {propertyKey: 'stats/atk', operation: ModifierConst.OPS.INC, value: 15, display: '+15 atk'},
            {propertyKey: 'stats/speed', operation: ModifierConst.OPS.SET, value: 3, display: '=3 speed'}
        ];
    }

    /**
     * @param {Array<Object>} storedRows
     * @returns {Object}
     */
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

    /**
     * @param {Object} inventoryManager
     * @param {Object} [props]
     * @returns {Object}
     */
    createGrowingSword(inventoryManager, props = {})
    {
        let owner = inventoryManager.owner;
        return new ItemEquipment(Object.assign({
            id: this.growingItemId,
            uid: 'growing_sword',
            key: 'growing_sword',
            label: 'Growing Sword',
            manager: inventoryManager,
            customData: {growth: sc.deepJsonClone(this.growth)},
            modifiers: {
                attack: new Modifier(
                    {key: 'atk', propertyKey: 'stats/atk', operation: ModifierConst.OPS.INC, value: 10, target: owner}
                ),
                setter: new Modifier(
                    {key: 'speed', propertyKey: 'stats/speed', operation: ModifierConst.OPS.SET, value: 3, target: owner}
                )
            }
        }, props));
    }

    /**
     * @param {Array<Object>} storedRows
     * @returns {Object}
     */
    createSetup(storedRows)
    {
        let repository = this.createRepository(storedRows);
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema({stats: {atk: 100, speed: 1}});
        let inventoryManager = new ItemsManager({
            owner: playerSchema,
            ownerIdProperty: 'player_id',
            eventsManager: new EventsManager()
        });
        let classPath = {listenedEvents: {}};
        classPath.listenEvent = (eventName, callback) => classPath.listenedEvents[eventName] = callback;
        classPath.getOwnerUniqueEventKey = (suffix) => 'player-7-'+suffix;
        classPath.getOwnerEventKey = () => 'player-7';
        playerSchema.skillsServer = {classPath};
        let chatClient = {sentMessages: []};
        chatClient.send = (message) => chatClient.sentMessages.push(message);
        let inventoryServer = {manager: inventoryManager, client: {client: chatClient}};
        playerSchema.inventory = inventoryServer;
        let updatedItems = [];
        inventoryManager.listenEvent(
            ItemsEvents.UPDATE_ITEM,
            (item) => updatedItems.push({key: item.key, customData: item.customData}),
            'testUpdatedItems'
        );
        let setup = {
            repository,
            itemsGrowthApplier: new ItemsGrowthApplier({dataServer: {getEntity: () => repository}}),
            inventoryManager,
            classPath,
            playerSchema,
            chatClient,
            updatedItems,
            event: {inventoryServer, playerSchema}
        };
        setup.addPlayerExperience = async (experienceAdded) => await classPath.listenedEvents[
            SkillsEvents.LEVEL_EXPERIENCE_ADDED
        ]({}, experienceAdded);
        return setup;
    }

    /**
     * @param {Object} storedRow
     * @returns {Promise<Object>}
     */
    async createEquippedSwordSetup(storedRow)
    {
        let setup = this.createSetup([storedRow]);
        setup.sword = this.createGrowingSword(setup.inventoryManager);
        await setup.inventoryManager.setItems({[setup.sword.getInventoryId()]: setup.sword});
        await setup.sword.equip();
        await setup.itemsGrowthApplier.onCreatePlayerInventoryAfter(setup.event);
        return setup;
    }

}

module.exports.ItemsGrowthApplierBuilder = ItemsGrowthApplierBuilder;
