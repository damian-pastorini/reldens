/**
 *
 * Reldens - Theme - ScoresPeriodReset
 *
 * Resets the scores when a new period starts (daily, weekly or monthly). The key of the last reset period is stored in
 * its config row and claimed with a conditional update (only the row still holding the previous key is changed), so
 * with many servers sharing the storage only one of them resets each period. The first check only stores the current
 * period. After a reset the players of the server scene rooms receive the empty top scores and their own score.
 *
 */

const { ScoresPeriodKeyBuilder } = require('reldens/lib/scores/server/scores-period-key-builder');
const { ScoresConst } = require('reldens/lib/scores/constants');
const { ScoresSender } = require('reldens/lib/scores/server/scores-sender');
const { RoomsConst } = require('reldens/lib/rooms/constants');

class ScoresPeriodReset
{

    /**
     * @param {Object} props
     * @param {Object} props.config
     * @param {Object} props.dataServer
     * @param {Object} props.roomsManager
     */
    constructor(props)
    {
        /** @type {Object} */
        this.config = props.config;
        /** @type {Object} */
        this.dataServer = props.dataServer;
        /** @type {Object} */
        this.roomsManager = props.roomsManager;
        /** @type {ScoresSender} */
        this.scoresSender = new ScoresSender();
        /** @type {NodeJS.Timeout|boolean} */
        this.checkInterval = false;
        /** @type {boolean} */
        this.isRunning = false;
    }

    /**
     * @returns {boolean}
     */
    start()
    {
        this.stop();
        this.checkInterval = setInterval(
            () => this.check(new Date()),
            Number(this.config.getWithoutLogs(
                ScoresConst.RESET.CONFIG_PATHS.CHECK_INTERVAL_MS,
                ScoresConst.RESET.DEFAULTS.CHECK_INTERVAL_MS
            ))
        );
        this.checkInterval.unref();
        return true;
    }

    /**
     * @returns {boolean}
     */
    stop()
    {
        if(!this.checkInterval){
            return false;
        }
        clearInterval(this.checkInterval);
        this.checkInterval = false;
        return true;
    }

    /**
     * @param {Date} currentDate
     * @returns {Promise<Object|boolean>}
     */
    async check(currentDate)
    {
        if(!this.config.getWithoutLogs(ScoresConst.RESET.CONFIG_PATHS.ENABLED, false)){
            return false;
        }
        if(this.isRunning){
            return false;
        }
        this.isRunning = true;
        let checkResult = await this.resetOnNewPeriod(currentDate).catch(() => false);
        this.isRunning = false;
        return checkResult;
    }

    /**
     * @param {Date} currentDate
     * @returns {Promise<Object|boolean>}
     */
    async resetOnNewPeriod(currentDate)
    {
        let periodKey = ScoresPeriodKeyBuilder.build(
            this.config.getWithoutLogs(ScoresConst.RESET.CONFIG_PATHS.PERIOD, ScoresConst.RESET.PERIODS.DAILY),
            currentDate
        );
        if(!periodKey){
            return false;
        }
        let configRepository = this.dataServer.getEntity('config');
        let lastPeriodRow = await configRepository.loadOne({
            scope: ScoresConst.RESET.LAST_PERIOD_KEY.SCOPE,
            path: ScoresConst.RESET.LAST_PERIOD_KEY.PATH
        });
        if(!lastPeriodRow){
            return false;
        }
        if(periodKey === lastPeriodRow.value){
            return false;
        }
        let claimedRows = await configRepository.update(
            {id: lastPeriodRow.id, value: lastPeriodRow.value},
            {value: periodKey}
        );
        if(0 === Number(claimedRows)){
            return false;
        }
        if(!lastPeriodRow.value){
            return {periodKey, resetScores: false};
        }
        await this.dataServer.getEntity('scores').delete({});
        if(this.config.getWithoutLogs(ScoresConst.RESET.CONFIG_PATHS.RESET_DETAILS, false)){
            await this.dataServer.getEntity('scoresDetail').delete({});
        }
        this.sendResetScores();
        return {periodKey, resetScores: true};
    }

    /**
     * @returns {number}
     */
    sendResetScores()
    {
        let updatedRooms = 0;
        let createdInstances = this.roomsManager?.createdInstances || {};
        for(let roomId of Object.keys(createdInstances)){
            let room = createdInstances[roomId];
            if(RoomsConst.ROOM_TYPE_SCENE !== room?.roomType){
                continue;
            }
            if(!room.state){
                continue;
            }
            this.scoresSender.broadcastTopScores(room, []);
            this.sendRoomPlayersResetScore(room);
            updatedRooms++;
        }
        return updatedRooms;
    }

    /**
     * @param {Object} room
     * @returns {number}
     */
    sendRoomPlayersResetScore(room)
    {
        let updatedPlayers = 0;
        for(let sessionId of room.playersKeysFromState()){
            let client = room.getClientById(sessionId);
            if(!client){
                continue;
            }
            this.scoresSender.updatePlayerScore(
                client,
                room.playerBySessionIdFromState(sessionId),
                ScoresConst.RESET.DEFAULTS.RESET_SCORE
            );
            updatedPlayers++;
        }
        return updatedPlayers;
    }

}

module.exports.ScoresPeriodReset = ScoresPeriodReset;
