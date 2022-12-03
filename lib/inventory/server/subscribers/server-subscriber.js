/**
 *
 * Reldens - EventsSubscriber
 *
 */

const { ItemsDataGenerator, GroupsDataGenerator } = require('@reldens/items-system');
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
        // map and assign items:
        configProcessor.inventory.items = ItemsDataGenerator.itemsListMappedData(
            (configProcessor.getWithoutLogs('server/customClasses/inventory/items', {})),
            await inventoryModelsManager.getEntity('item').loadAllWithRelations()
        );
        // map and assign groups:
        let groupModelsList = await inventoryModelsManager.getEntity('itemGroup').loadAll();
        configProcessor.inventory.groups = GroupsDataGenerator.groupsListMappedData(
            (configProcessor.getWithoutLogs('server/customClasses/inventory/groups', {})),
            groupModelsList
        );
    }

}

module.exports.ServerSubscriber = ServerSubscriber;
