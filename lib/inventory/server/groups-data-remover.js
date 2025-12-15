/**
 *
 * Reldens - GroupsDataRemover
 *
 * Removes inventory group data from the configuration manager.
 * Provides static methods for removing groups by ID or from lists.
 *
 */

class GroupsDataRemover
{

    /**
     * @param {Object} configProcessor
     * @param {Array<Object>} groupModelsList
     * @returns {boolean}
     */
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

    /**
     * @param {Object} configProcessor
     * @param {Object} groupModel
     * @returns {boolean}
     */
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

    /**
     * @param {Object} configProcessor
     * @param {Object} groupModel
     * @returns {Array<Object>}
     */
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
