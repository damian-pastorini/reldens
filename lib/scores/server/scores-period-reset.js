/**
 *
 * Reldens - ScoresPeriodReset
 *
 * Resets the scores when a new period starts (daily, weekly or monthly). The key of the last reset period is stored in
 * its config row and changed only with conditional updates (only the row still holding the read value is changed), so
 * with many servers sharing the storage only one of them resets each period. The reset first stores a pending value
 * (the new period key, the pending mark and the claim time), deletes the scores and then stores the period key: a reset
 * that fails or stops before the end keeps the pending value, which any server takes over once it is older than the
 * pending timeout, so the reset is always completed. The first check only stores the current period. After a reset the
 * server that ran it sends the stored scores to the players of its scene rooms, and every other server sends them when
 * it observes the new period key, so no player keeps the scores of the previous period.
 *
 */

const { ScoresPeriodKeyBuilder } = require('./scores-period-key-builder');
const { ScoresProvider } = require('./scores-provider');
const { ScoresSender } = require('./scores-sender');
const { ScoresConst } = require('../constants');
const { RoomsConst } = require('../../rooms/constants');
const { Logger, sc } = require('@reldens/utils');

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
        /** @type {ScoresProvider} */
        this.scoresProvider = new ScoresProvider({dataServer: props.dataServer});
        /** @type {ScoresSender} */
        this.scoresSender = new ScoresSender();
        /** @type {NodeJS.Timeout|boolean} */
        this.checkInterval = false;
        /** @type {boolean} */
        this.isRunning = false;
        /** @type {string|boolean} */
        this.observedPeriodKey = false;
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
        let checkResult = await this.resetOnNewPeriod(currentDate).catch((error) => {
            Logger.error('Scores period reset error.', error.message);
            return false;
        });
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
            return await this.refreshObservedPeriod(periodKey);
        }
        if(!lastPeriodRow.value){
            return await this.storeFirstPeriod(configRepository, lastPeriodRow, periodKey);
        }
        if(this.isResetInProgress(lastPeriodRow.value, currentDate)){
            this.observedPeriodKey = lastPeriodRow.value;
            return false;
        }
        return await this.resetScores(configRepository, lastPeriodRow, periodKey, currentDate);
    }

    /**
     * @param {Object} configRepository
     * @param {Object} lastPeriodRow
     * @param {string} periodKey
     * @param {Date} currentDate
     * @returns {Promise<Object|boolean>}
     */
    async resetScores(configRepository, lastPeriodRow, periodKey, currentDate)
    {
        let pendingValue = periodKey+ScoresConst.RESET.PENDING_MARK+currentDate.getTime();
        if(!await this.replacePeriodValue(configRepository, lastPeriodRow, pendingValue)){
            this.observedPeriodKey = lastPeriodRow.value;
            return false;
        }
        await this.dataServer.getEntity('scores').delete({});
        if(this.config.getWithoutLogs(ScoresConst.RESET.CONFIG_PATHS.RESET_DETAILS, false)){
            await this.dataServer.getEntity('scoresDetail').delete({});
        }
        if(!await this.replacePeriodValue(configRepository, {id: lastPeriodRow.id, value: pendingValue}, periodKey)){
            this.observedPeriodKey = pendingValue;
            return false;
        }
        this.observedPeriodKey = periodKey;
        await this.sendCurrentScores();
        return {periodKey, resetScores: true};
    }

    /**
     * @param {Object} configRepository
     * @param {Object} lastPeriodRow
     * @param {string} periodKey
     * @returns {Promise<Object|boolean>}
     */
    async storeFirstPeriod(configRepository, lastPeriodRow, periodKey)
    {
        if(!await this.replacePeriodValue(configRepository, lastPeriodRow, periodKey)){
            return false;
        }
        this.observedPeriodKey = periodKey;
        return {periodKey, resetScores: false};
    }

    /**
     * @param {string} periodKey
     * @returns {Promise<Object|boolean>}
     */
    async refreshObservedPeriod(periodKey)
    {
        if(periodKey === this.observedPeriodKey){
            return false;
        }
        let previousObservedKey = this.observedPeriodKey;
        this.observedPeriodKey = periodKey;
        if(false === previousObservedKey){
            return false;
        }
        await this.sendCurrentScores();
        return {periodKey, resetScores: false, refreshedScores: true};
    }

    /**
     * @param {string} storedValue
     * @param {Date} currentDate
     * @returns {boolean}
     */
    isResetInProgress(storedValue, currentDate)
    {
        if(-1 === storedValue.indexOf(ScoresConst.RESET.PENDING_MARK)){
            return false;
        }
        let claimedAt = Number(storedValue.split(ScoresConst.RESET.PENDING_MARK).pop());
        return currentDate.getTime() - claimedAt < ScoresConst.RESET.DEFAULTS.PENDING_TIMEOUT_MS;
    }

    /**
     * @param {Object} configRepository
     * @param {Object} currentRow
     * @param {string} newValue
     * @returns {Promise<boolean>}
     */
    async replacePeriodValue(configRepository, currentRow, newValue)
    {
        let updatedRows = await configRepository.update(
            {id: currentRow.id, value: currentRow.value},
            {value: newValue}
        );
        return 0 < Number(updatedRows);
    }

    /**
     * @returns {Promise<number>}
     */
    async sendCurrentScores()
    {
        let topScores = await this.scoresProvider.fetchTopScoresMappedData(ScoresConst.TOP_SCORES_PAGE_SIZE);
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
            this.scoresSender.broadcastTopScores(room, topScores);
            await this.sendRoomPlayersScore(room);
            updatedRooms++;
        }
        return updatedRooms;
    }

    /**
     * @param {Object} room
     * @returns {Promise<number>}
     */
    async sendRoomPlayersScore(room)
    {
        let updatedPlayers = 0;
        for(let sessionId of room.playersKeysFromState()){
            let client = room.getClientById(sessionId);
            if(!client){
                continue;
            }
            let playerSchema = room.playerBySessionIdFromState(sessionId);
            let playerScore = await this.scoresProvider.fetchPlayerScore(playerSchema.player_id);
            this.scoresSender.updatePlayerScore(
                client,
                playerSchema,
                sc.get(playerScore, 'total_score', 0) || ScoresConst.RESET.DEFAULTS.RESET_SCORE
            );
            updatedPlayers++;
        }
        return updatedPlayers;
    }

}

module.exports.ScoresPeriodReset = ScoresPeriodReset;
