/**
 *
 * Reldens - EventsSubscriber
 *
 */

const { ItemsDataGenerator } = require('../items-data-generator');
const { GroupsDataGenerator } = require('../groups-data-generator');
const { sc } = require('@reldens/utils');

class ServerSubscriber
{
    
    static async initializeInventory(configProcessor, inventoryModelsManager)
    {
        if(!sc.hasOwn(configProcessor, 'inventory')){
            configProcessor.inventory = {};
        }
        if(!sc.hasOwn(configProcessor, 'groups')){
            configProcessor.inventory.groups = {
                groupModels: [],
                groupList: {},
                groupBaseData: {}
            };
        }
        ItemsDataGenerator.appendItemsList(
            configProcessor,
            await inventoryModelsManager.getEntity('item').loadAllWithRelations()
        );
        GroupsDataGenerator.appendGroupsList(
            configProcessor,
            await inventoryModelsManager.getEntity('group').loadAll()
        );
    }

}

module.exports.ServerSubscriber = ServerSubscriber;
