/**
 *
 * Reldens - GroupsDataRemover
 *
 */

class GroupsDataRemover
{

    static removeGroupsList(configProcessor, groupModelsList)
    {
        if(0 === groupModelsList.length){
            return false;
        }
        for(let groupModel of groupModelsList){
            this.removeGroup(configProcessor, groupModel);
        }
        return true;
    }

    static removeGroup(configProcessor, groupModel)
    {
        if(!groupModel){
            return false;
        }
        this.removeGroupById(configProcessor, groupModel);
        delete configProcessor.inventory.groups.groupList[groupModel.key];
        delete configProcessor.inventory.groups.groupBaseData[groupModel.key];
        return true;
    }

    static removeGroupById(configProcessor, groupModel)
    {
        let groupModels = configProcessor.inventory.groups.groupModels;
        let remove = false;
        for(let group of groupModels){
            if(group.id === groupModel.id){
                remove = groupModels.indexOf(group);
                break;
            }
        }
        if(false !== remove){
            delete groupModels[remove];
        }
        return groupModels;
    }

}

module.exports.GroupsDataRemover = GroupsDataRemover;
