/**
 *
 * Reldens - GroupHotPlugCallbacks
 *
 * Provides hot-plug callbacks for inventory group management.
 * Handles create, update, and delete operations with live broadcast to connected rooms.
 *
 */

const { AdminDistHelper } = require('@reldens/cms/lib/admin-dist-helper');
const { GroupsDataGenerator } = require('@reldens/items-system');
const { GroupsDataRemover } = require('./groups-data-remover');
const { RoomsConst } = require('../../rooms/constants');
const { ItemsConst } = require('@reldens/items-system');

class GroupHotPlugCallbacks
{

    /**
     * @param {Object} projectConfig
     * @param {string} bucket
     * @param {string} distFolder
     * @returns {Function|boolean}
     */
    static beforeDeleteCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        return async (model) => {
            await AdminDistHelper.removeBucketAndDistFiles(
                distFolder,
                bucket,
                model.files_name
            );
            let configProcessor = projectConfig.serverManager.configManager;
            GroupsDataRemover.removeGroup(configProcessor, model);
            return this.broadcastGroupsUpdate(projectConfig);
        };
    }

    /**
     * @param {Object} projectConfig
     * @param {string} bucket
     * @param {string} distFolder
     * @returns {Function|boolean}
     */
    static afterUpdateCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        return async (groupModel, id, preparedParams, params) => {
            if(params.files_name){
                await AdminDistHelper.copyBucketFilesToDist(bucket, groupModel.files_name, distFolder);
            }
            GroupsDataGenerator.appendGroup(
                groupModel,
                (projectConfig.serverManager.configManager.inventory.groups || {}),
                (projectConfig.serverManager.configManager.getWithoutLogs('server/customClasses/inventory/groups', {}))
            );
            return this.broadcastGroupsUpdate(projectConfig);
        };
    }

    /**
     * @param {Object} projectConfig
     * @returns {boolean}
     */
    static broadcastGroupsUpdate(projectConfig)
    {
        let roomsManager = projectConfig.serverManager.roomsManager;
        let createdRooms = Object.keys(roomsManager.createdInstances);
        if(0 === createdRooms.length){
            return false;
        }
        for(let i of createdRooms){
            let room = roomsManager.createdInstances[i];
            if(RoomsConst.ROOM_TYPE_SCENE !== room.roomType){
                continue;
            }
            let broadcastData = {
                act: ItemsConst.ACTION_SET_GROUPS,
                groups: room.config.getWithoutLogs('inventory/groups/groupBaseData', {})
            };
            room.broadcast('*', broadcastData);
        }
        return true;
    }

}

module.exports.GroupHotPlugCallbacks = GroupHotPlugCallbacks;
