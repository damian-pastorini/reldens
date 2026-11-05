/**
 *
 * Reldens - RoomsUsageCollector
 *
 * Collects the usage of every room created in this server process (RoomsManager.createdInstances): the connected
 * clients, the players in the room state, the room objects, the physics bodies and, for the scene rooms, the physics
 * world steps time since the previous collection (WorldTimer.fetchStepsUsage()), which is the main CPU work of each
 * scene room: the average step time and the busy percent of one core. The memory of a single room can not be
 * measured since every room shares the same Node.js process heap.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {Object} RoomUsage
 * @property {string} roomId
 * @property {string} roomName
 * @property {string} roomType
 * @property {number} clientsCount
 * @property {number} playersCount
 * @property {number} objectsCount
 * @property {number} bodiesCount
 * @property {number} stepAverageMs
 * @property {number} stepsBusyPercent
 */
class RoomsUsageCollector
{

    /**
     * @param {Object<string, Object>} createdInstances
     */
    constructor(createdInstances)
    {
        /** @type {Object<string, Object>} */
        this.createdInstances = createdInstances;
        /** @type {number} */
        this.valuesPrecision = 2;
        /** @type {number} */
        this.previousCollectTime = Date.now();
    }

    /**
     * @returns {Array<RoomUsage>}
     */
    collect()
    {
        let collectTime = Date.now();
        let elapsedMs = Math.max(1, collectTime - this.previousCollectTime);
        this.previousCollectTime = collectTime;
        let roomsUsage = [];
        for(let roomId of Object.keys(this.createdInstances)){
            roomsUsage.push(this.collectRoomUsage(roomId, this.createdInstances[roomId], elapsedMs));
        }
        return roomsUsage;
    }

    /**
     * @param {string} roomId
     * @param {Object} room
     * @param {number} elapsedMs
     * @returns {RoomUsage}
     */
    collectRoomUsage(roomId, room, elapsedMs)
    {
        let stepsUsage = {stepsCount: 0, stepsDurationMs: 0};
        if(sc.isFunction(room.worldTimer?.fetchStepsUsage)){
            stepsUsage = room.worldTimer.fetchStepsUsage();
        }
        return {
            roomId,
            roomName: room.roomName,
            roomType: room.roomType,
            clientsCount: sc.get(room, 'clients', []).length,
            playersCount: sc.isFunction(room.playersCountInState) ? room.playersCountInState() : 0,
            objectsCount: Object.keys(sc.get(room.objectsManager, 'roomObjects', {})).length,
            bodiesCount: sc.get(room.roomWorld, 'bodies', []).length,
            stepAverageMs: 0 === stepsUsage.stepsCount
                ? 0
                : sc.roundToPrecision(stepsUsage.stepsDurationMs / stepsUsage.stepsCount, this.valuesPrecision),
            stepsBusyPercent: sc.roundToPrecision(stepsUsage.stepsDurationMs / elapsedMs * 100, this.valuesPrecision)
        };
    }

    /**
     * @param {Array<RoomUsage>} roomsUsage
     * @returns {{roomsCount: number, sceneRoomsCount: number, playersCount: number, physicsBusyPercent: number}}
     */
    summarize(roomsUsage)
    {
        let summary = {roomsCount: roomsUsage.length, sceneRoomsCount: 0, playersCount: 0, physicsBusyPercent: 0};
        for(let roomUsage of roomsUsage){
            if(0 < roomUsage.bodiesCount){
                summary.sceneRoomsCount++;
            }
            summary.playersCount += roomUsage.playersCount;
            summary.physicsBusyPercent += roomUsage.stepsBusyPercent;
        }
        summary.physicsBusyPercent = sc.roundToPrecision(summary.physicsBusyPercent, this.valuesPrecision);
        return summary;
    }

}

module.exports.RoomsUsageCollector = RoomsUsageCollector;
