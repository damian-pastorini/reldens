/**
 *
 * Reldens - Room Enemies Reset
 *
 * Runs the respawn restore on every respawn-managed object in the live scene rooms, dead or alive, immediately, without
 * waiting for the seeded respawn_time: each one is stopped, gets its initial stats, a respawn tile and the active state.
 * Enemies killed, hurt or moved by one test would otherwise be missing, start the next test without their full life or
 * stuck where the last fight left them, which makes combat specs fail for lack of a target or of time instead of for a
 * real defect.
 *
 */

const { Logger } = require('@reldens/utils');

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
        Logger.info('[room-enemies-reset] Restored '+restoredCount+' respawn objects to active with their full stats.');
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

    static async restoreInstance(objInstance, room)
    {
        if(!objInstance || !objInstance.respawnBehavior){
            return false;
        }
        clearTimeout(objInstance.respawnTimer);
        clearTimeout(objInstance.respawnStateTimer);
        clearTimeout(objInstance.objectBody?.moveToOriginalPointTimer);
        objInstance.objectBody?.resetAuto();
        objInstance.objectBody?.stopFull();
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
