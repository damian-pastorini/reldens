/**
 *
 * Reldens - Room Enemies Reset
 *
 * Restores every respawn-managed object in the live scene rooms back to active, immediately, without
 * waiting for the seeded respawn_time. Enemies killed by one test would otherwise still be missing when
 * the next test starts, which makes combat specs fail for lack of a target instead of for a real defect.
 *
 */

const { Logger } = require('@reldens/utils');
const { GameConst } = require('../../../lib/game/constants');

class RoomEnemiesReset
{

    static async restoreAll(roomsManager)
    {
        if(!roomsManager || !roomsManager.createdInstances){
            return 0;
        }
        let restoredCount = 0;
        for(let instanceId of Object.keys(roomsManager.createdInstances)){
            restoredCount += await RoomEnemiesReset.restoreRoom(roomsManager.createdInstances[instanceId]);
        }
        Logger.info('[room-enemies-reset] Restored '+restoredCount+' respawn objects.');
        return restoredCount;
    }

    static async restoreRoom(room)
    {
        if(!room || !room.roomWorld || !room.roomWorld.respawnAreas){
            return 0;
        }
        let respawnAreas = room.roomWorld.respawnAreas;
        let restoredCount = 0;
        for(let layerName of Object.keys(respawnAreas)){
            restoredCount += await RoomEnemiesReset.restoreRespawnArea(respawnAreas[layerName], room);
        }
        return restoredCount;
    }

    static async restoreRespawnArea(respawnArea, room)
    {
        if(!respawnArea || !respawnArea.instancesCreated){
            return 0;
        }
        let restoredCount = 0;
        for(let areaId of Object.keys(respawnArea.instancesCreated)){
            restoredCount += await RoomEnemiesReset.restoreInstances(respawnArea.instancesCreated[areaId], room);
        }
        return restoredCount;
    }

    static async restoreInstances(instances, room)
    {
        if(!instances || !instances.length){
            return 0;
        }
        let restoredCount = 0;
        for(let objInstance of instances){
            let restored = await RoomEnemiesReset.restoreInstance(objInstance, room);
            if(restored){
                restoredCount++;
            }
        }
        return restoredCount;
    }

    static isDownState(objInstance)
    {
        let bodyState = objInstance.objectBody ? objInstance.objectBody.bodyState : false;
        if(!bodyState){
            return false;
        }
        if(GameConst.STATUS.DEATH === bodyState.inState){
            return true;
        }
        return GameConst.STATUS.DISABLED === bodyState.inState;
    }

    static async restoreInstance(objInstance, room)
    {
        if(!objInstance || !objInstance.respawnBehavior){
            return false;
        }
        if(!RoomEnemiesReset.isDownState(objInstance)){
            return false;
        }
        clearTimeout(objInstance.respawnTimer);
        clearTimeout(objInstance.respawnStateTimer);
        try {
            await objInstance.respawnBehavior.restore(room);
            objInstance.respawnBehavior.setActive(room);
        } catch (error) {
            Logger.warning('[room-enemies-reset] Could not restore object: '+error.message);
            return false;
        }
        return true;
    }

}

module.exports.RoomEnemiesReset = RoomEnemiesReset;
