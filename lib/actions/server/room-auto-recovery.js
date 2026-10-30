/**
 *
 * Reldens - RoomAutoRecovery
 *
 * Runs the players and the enemies auto recovery of every scene room on its own interval, started when the room is
 * created and cleared when the room is disposed. The configuration is read on every tick, so the enabled flags and the
 * amounts can change on the running server, only the tick time is read once when the room is created.
 *
 */

const { PlayersAutoRecovery } = require('./players-auto-recovery');
const { ObjectsAutoRecovery } = require('./objects-auto-recovery');
const { ActionsConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class RoomAutoRecovery
{

    /**
     * @param {Object} props
     * @param {Object} props.events
     */
    constructor(props)
    {
        /** @type {PlayersAutoRecovery} */
        this.playersAutoRecovery = new PlayersAutoRecovery({events: props.events});
        /** @type {ObjectsAutoRecovery} */
        this.objectsAutoRecovery = new ObjectsAutoRecovery();
        /** @type {Object<string, NodeJS.Timeout>} */
        this.roomsIntervals = {};
        /** @type {Object<string, boolean>} */
        this.runningRooms = {};
    }

    /**
     * @param {Object} room
     * @returns {boolean}
     */
    startRoomTicks(room)
    {
        this.stopRoomTicks(room.roomId);
        let tickMs = Number(room.config.getWithoutLogs(
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.TICK_MS,
            ActionsConst.AUTO_RECOVERY.DEFAULTS.TICK_MS
        ));
        this.roomsIntervals[room.roomId] = setInterval(() => this.runRoomTick(room), tickMs);
        return true;
    }

    /**
     * @param {string} roomId
     * @returns {boolean}
     */
    stopRoomTicks(roomId)
    {
        let roomInterval = this.roomsIntervals[roomId];
        if(!roomInterval){
            return false;
        }
        clearInterval(roomInterval);
        delete this.roomsIntervals[roomId];
        delete this.runningRooms[roomId];
        return true;
    }

    /**
     * @param {Object} room
     * @returns {Promise<Object|boolean>}
     */
    async runRoomTick(room)
    {
        if(this.runningRooms[room.roomId]){
            return false;
        }
        this.runningRooms[room.roomId] = true;
        let tickResult = await this.recoverRoom(room).catch((error) => {
            Logger.error('Auto recovery error on room "'+room.roomName+'".', error.message);
            return false;
        });
        delete this.runningRooms[room.roomId];
        return tickResult;
    }

    /**
     * @param {Object} room
     * @returns {Promise<Object>}
     */
    async recoverRoom(room)
    {
        return {
            recoveredObjects: this.objectsAutoRecovery.recoverRoomObjects(
                room,
                room.config.getWithoutLogs(ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS, false),
                room.playersAffectedProperty
            ),
            recoveredPlayers: await this.playersAutoRecovery.recoverRoomPlayers(
                room,
                room.config.getWithoutLogs(ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS, false)
            )
        };
    }

}

module.exports.RoomAutoRecovery = RoomAutoRecovery;
