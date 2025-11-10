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
        if(!sc.hasOwn(configProcessor.inventory, 'groups')){
            configProcessor.inventory.groups = {
                groupModels: [],
                groupList: {},
                groupBaseData: {}
            };
        }
        configProcessor.inventory.items = ItemsDataGenerator.itemsListMappedData(
            (configProcessor.getWithoutLogs('server/customClasses/inventory/items', {})),
            await inventoryModelsManager.getEntity('itemsItem').loadAllWithRelations()
        );
        let groupsMappedData = GroupsDataGenerator.groupsListMappedData(
            (configProcessor.getWithoutLogs('server/customClasses/inventory/groups', {})),
            await inventoryModelsManager.getEntity('itemsGroup').loadAll()
        );
        if(!groupsMappedData){
            return;
        }
        Object.assign(configProcessor.inventory.groups, groupsMappedData);
    }

}

module.exports.ServerSubscriber = ServerSubscriber;
