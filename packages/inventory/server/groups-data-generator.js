/**
 *
 * Reldens - GroupsDataGenerator
 *
 */

const { ItemGroup} = require('@reldens/items-system');
const { sc } = require('@reldens/utils');

class GroupsDataGenerator
{

    static async appendGroupsFullList(configProcessor, inventoryModelsManager)
    {
        // use the inventory models manager to get the items list loaded:
        let groupModelsList = await inventoryModelsManager.getEntity('group').loadAll();
        if(0 === groupModelsList.length){
            return {};
        }
        let groupList = {};
        let groupBaseData = {};
        let inventoryClasses = configProcessor.get('server/customClasses/inventory/groups');
        for(let groupModel of groupModelsList){
            let groupClass = ItemGroup;
            if(sc.hasOwn(inventoryClasses, groupModel.key)){
                groupClass = inventoryClasses[groupModel.key];
            }
            groupList[groupModel.key] = {class: groupClass, data: groupModel};
            let {id, key, label, description, sort} = groupModel;
            groupBaseData[key] = {id, key, label, description, sort};
        }
        configProcessor.inventory.groups = {groupModels: groupModelsList, groupList, groupBaseData};
        return configProcessor.inventory.groups;
    }
}

module.exports.GroupsDataGenerator = GroupsDataGenerator;