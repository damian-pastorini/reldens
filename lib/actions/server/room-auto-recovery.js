/**
 *
 * Reldens - RoomAutoRecovery
 *
 * Runs the players and the enemies auto recovery of every scene room on its own interval, started when the room is
 * created and cleared when the room is disposed. The configuration is read once when this class is created and the
 * ticks only use the kept values.
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
     * @param {Object} props.config
     */
    constructor(props)
    {
        /** @type {Object} */
        this.config = props.config;
        /** @type {PlayersAutoRecovery} */
        this.playersAutoRecovery = new PlayersAutoRecovery({events: props.events});
        /** @type {ObjectsAutoRecovery} */
        this.objectsAutoRecovery = new ObjectsAutoRecovery();
        /** @type {Object<string, NodeJS.Timeout>} */
        this.roomsIntervals = {};
        /** @type {Object<string, boolean>} */
        this.runningRooms = {};
        /** @type {number} */
        this.tickMs = ActionsConst.AUTO_RECOVERY.DEFAULTS.TICK_MS;
        /** @type {Object|boolean} */
        this.objectsConfig = false;
        /** @type {Object|boolean} */
        this.playersConfig = false;
        this.loadConfig();
    }

    loadConfig()
    {
        this.tickMs = this.config.getWithoutLogs(
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.TICK_MS,
            ActionsConst.AUTO_RECOVERY.DEFAULTS.TICK_MS
        );
        this.objectsConfig = this.config.getWithoutLogs(ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS, false);
        this.playersConfig = this.config.getWithoutLogs(ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS, false);
    }

    /**
     * @param {Object} room
     * @returns {boolean}
     */
    startRoomTicks(room)
    {
        this.stopRoomTicks(room.roomId);
        this.roomsIntervals[room.roomId] = setInterval(() => this.runRoomTick(room), this.tickMs);
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
                this.objectsConfig,
                room.playersAffectedProperty
            ),
            recoveredPlayers: await this.playersAutoRecovery.recoverRoomPlayers(room, this.playersConfig)
        };
    }

}

module.exports.RoomAutoRecovery = RoomAutoRecovery;
