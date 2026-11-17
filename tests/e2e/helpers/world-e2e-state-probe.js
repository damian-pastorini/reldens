/**
 *
 * Reldens - World E2E State Probe
 *
 * Server side e2e endpoints for the world specs of a live scene room: the scene changes of the room blocked (every
 * other room answers as not available with the server busy reason, the same answer the rooms availability gives for an
 * overloaded server) and the cancel flags of a timing object set (cancel on move, on hit and on out of range). Both
 * changes keep the original value and are restored by their restore endpoint or, when a spec ends before it, after the
 * given duration, so a failed spec never leaves a room blocked or an object changed for the next one.
 *
 */

const { RoomMovementState } = require('./room-movement-state');
const { RoomPlayerPlacement } = require('./room-player-placement');
const { GameConst } = require('../../../lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class WorldE2eStateProbe
{

    static MAX_CHANGE_DURATION_MS = 180000;
    static TIMING_FLAGS = ['cancelOnMove', 'cancelOnHit', 'cancelOnOutOfRange'];
    static blockedRooms = new Map();
    static changedTimingObjects = new Map();

    static blockSceneChanges(room, durationMs)
    {
        let blockedRoom = WorldE2eStateProbe.blockedRooms.get(room.roomId);
        if(blockedRoom){
            clearTimeout(blockedRoom.restoreTimer);
        }
        let originalAvailability = blockedRoom ? blockedRoom.originalAvailability : room.roomsAvailability;
        room.roomsAvailability = {
            fetchRoomAvailability: async (roomName) => ({
                isAvailable: room.roomName === roomName,
                reason: room.roomName === roomName ? '' : GameConst.ROOM_UNAVAILABLE.SERVER_BUSY
            })
        };
        WorldE2eStateProbe.blockedRooms.set(room.roomId, {
            originalAvailability,
            restoreTimer: setTimeout(
                () => WorldE2eStateProbe.unblockSceneChanges(room),
                Math.min(Number(durationMs) || 1, WorldE2eStateProbe.MAX_CHANGE_DURATION_MS)
            )
        });
        return {blocked: true, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY};
    }

    static unblockSceneChanges(room)
    {
        let blockedRoom = WorldE2eStateProbe.blockedRooms.get(room.roomId);
        if(!blockedRoom){
            return {blocked: false};
        }
        clearTimeout(blockedRoom.restoreTimer);
        room.roomsAvailability = blockedRoom.originalAvailability;
        WorldE2eStateProbe.blockedRooms.delete(room.roomId);
        return {blocked: false};
    }

    static mapTimingFlags(roomObject)
    {
        let timingFlags = {};
        for(let flagName of WorldE2eStateProbe.TIMING_FLAGS){
            timingFlags[flagName] = true === roomObject[flagName];
        }
        return timingFlags;
    }

    static setTimingFlags(room, objectKey, timingFlags, durationMs)
    {
        let roomObject = RoomPlayerPlacement.findObjectWithBody(room, objectKey);
        if(!roomObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        let changeKey = room.roomId+'/'+objectKey;
        let changedObject = WorldE2eStateProbe.changedTimingObjects.get(changeKey);
        if(changedObject){
            clearTimeout(changedObject.restoreTimer);
        }
        let originalFlags = changedObject ? changedObject.originalFlags : WorldE2eStateProbe.mapTimingFlags(roomObject);
        for(let flagName of WorldE2eStateProbe.TIMING_FLAGS){
            if(sc.hasOwn(timingFlags, flagName)){
                roomObject[flagName] = true === timingFlags[flagName];
            }
        }
        WorldE2eStateProbe.changedTimingObjects.set(changeKey, {
            originalFlags,
            restoreTimer: setTimeout(
                () => WorldE2eStateProbe.restoreTimingFlags(room, objectKey),
                Math.min(Number(durationMs) || 1, WorldE2eStateProbe.MAX_CHANGE_DURATION_MS)
            )
        });
        return {objectKey: roomObject.key, timingFlags: WorldE2eStateProbe.mapTimingFlags(roomObject)};
    }

    static restoreTimingFlags(room, objectKey)
    {
        let changeKey = room.roomId+'/'+objectKey;
        let changedObject = WorldE2eStateProbe.changedTimingObjects.get(changeKey);
        if(!changedObject){
            return {restored: false};
        }
        clearTimeout(changedObject.restoreTimer);
        WorldE2eStateProbe.changedTimingObjects.delete(changeKey);
        let roomObject = RoomPlayerPlacement.findObjectWithBody(room, objectKey);
        if(!roomObject){
            return {restored: false};
        }
        Object.assign(roomObject, changedObject.originalFlags);
        return {restored: true, timingFlags: WorldE2eStateProbe.mapTimingFlags(roomObject)};
    }

    static fetchTimingObject(room, objectKey)
    {
        let roomObject = RoomPlayerPlacement.findObjectWithBody(room, objectKey);
        if(!roomObject){
            return {error: 'Object '+objectKey+' not found in room '+room.roomName+'.'};
        }
        return {
            objectKey: roomObject.key,
            isActive: true === roomObject.isActive,
            timingFlags: WorldE2eStateProbe.mapTimingFlags(roomObject)
        };
    }

    static registerEndpoints(serverManager)
    {
        RoomMovementState.registerActionEndpoint(serverManager, '/api/e2e/world/block-scene-changes', (room, body) => {
            return WorldE2eStateProbe.blockSceneChanges(room, sc.get(body, 'durationMs', 0));
        });
        RoomMovementState.registerActionEndpoint(serverManager, '/api/e2e/world/unblock-scene-changes', (room) => {
            return WorldE2eStateProbe.unblockSceneChanges(room);
        });
        RoomMovementState.registerActionEndpoint(serverManager, '/api/e2e/world/timing-flags', (room, body) => {
            return WorldE2eStateProbe.setTimingFlags(
                room,
                sc.get(body, 'objectKey', ''),
                sc.get(body, 'timingFlags', {}),
                sc.get(body, 'durationMs', 0)
            );
        });
        RoomMovementState.registerActionEndpoint(serverManager, '/api/e2e/world/restore-timing-flags', (room, body) => {
            return WorldE2eStateProbe.restoreTimingFlags(room, sc.get(body, 'objectKey', ''));
        });
        RoomMovementState.registerActionEndpoint(serverManager, '/api/e2e/world/timing-object', (room, body) => {
            return WorldE2eStateProbe.fetchTimingObject(room, sc.get(body, 'objectKey', ''));
        });
        Logger.info('[world-e2e-state-probe] World endpoints registered.');
    }

}

module.exports.WorldE2eStateProbe = WorldE2eStateProbe;
