/**
 *
 * Reldens - GroupHotPlugCallbacks
 *
 */

const { AdminDistHelper } = require('../../admin/server/upload-file/admin-dist-helper');
const { GroupsDataGenerator } = require('./groups-data-generator');
const { GroupsDataRemover } = require('./groups-data-remover');
const { RoomsConst } = require('../../rooms/constants');
const { ItemsConst } = require('@reldens/items-system');

class GroupHotPlugCallbacks
{

    static beforeDeleteCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        // eslint-disable-next-line no-unused-vars
        return async (model, id, resource) => {
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

    static afterUpdateCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        // eslint-disable-next-line no-unused-vars
        return async (model, id, preparedParams, params, originalParams, resource) => {
            if(params.files_name){
                await AdminDistHelper.copyBucketFilesToDist(
                    bucket,
                    model.files_name,
                    distFolder
                );
            }
            let configProcessor = projectConfig.serverManager.configManager;
            GroupsDataGenerator.appendGroup(configProcessor, model);
            return this.broadcastGroupsUpdate(projectConfig);
        };
    }

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
                groups: room.config.get('inventory/groups/groupBaseData')
            };
            room.broadcast(broadcastData);
        }
    }

}

module.exports.GroupHotPlugCallbacks = GroupHotPlugCallbacks;
