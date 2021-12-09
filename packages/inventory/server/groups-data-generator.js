/**
 *
 * Reldens - GroupsDataGenerator
 *
 */

const { ItemGroup} = require('@reldens/items-system');
const { sc } = require('@reldens/utils');

class GroupsDataGenerator
{

    static appendGroupsList(configProcessor, groupModelsList)
    {
        if(0 === groupModelsList.length){
            return false;
        }
        configProcessor.inventory.groups.groupModels.push(...groupModelsList);
        let inventoryClasses = configProcessor.get('server/customClasses/inventory/groups');
        for(let groupModel of groupModelsList){
            let groupClass = sc.getDef(inventoryClasses, groupModel.key, ItemGroup);
            let {id, key, label, description, sort} = groupModel;
            configProcessor.inventory.groups.groupList[groupModel.key] = {class: groupClass, data: groupModel};
            configProcessor.inventory.groups.groupBaseData[key] = {id, key, label, description, sort};
        }
        return true;
    }

    static appendGroup(configProcessor, groupModel)
    {
        if(!groupModel){
            return false;
        }
        configProcessor.inventory.groups.groupModels.push(groupModel);
        let inventoryClasses = configProcessor.get('server/customClasses/inventory/groups');
        let groupClass = sc.getDef(inventoryClasses, groupModel.key, ItemGroup);
        let {id, key, label, description, sort} = groupModel;
        configProcessor.inventory.groups.groupList[groupModel.key] = {class: groupClass, data: groupModel};
        configProcessor.inventory.groups.groupBaseData[key] = {id, key, label, description, sort};
        return true;
    }

}

module.exports.GroupsDataGenerator = GroupsDataGenerator;