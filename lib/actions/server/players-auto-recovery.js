/**
 *
 * Reldens - PlayersAutoRecovery
 *
 * Recovers the configured stats of the alive players of a room on every tick, up to their base values, once the
 * "startDelayMs" passed since each stat was last seen lowered (the recovery state is the player private data). With
 * "onlyOutOfBattle" (enabled when missing) a player in battle (an enemy of the room fights it, or a PvP battle of it or
 * against it is still open) never recovers and the delay counts from the battle end. The client stats and the life
 * bars are refreshed on every recovery and the stats are saved in the storage every "persistEveryTicks" recoveries, the
 * leave, the death and the scene change save them as usual.
 *
 */

const { StatsRecoveryCalculator } = require('./stats-recovery-calculator');
const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { sc } = require('@reldens/utils');

class PlayersAutoRecovery
{

    /**
     * @param {Object} props
     * @param {Object} props.events
     */
    constructor(props)
    {
        /** @type {Object} */
        this.events = props.events;
    }

    /**
     * @param {Object} room
     * @param {Object} playersConfig
     * @param {number} [now]
     * @returns {Promise<number>}
     */
    async recoverRoomPlayers(room, playersConfig, now = Date.now())
    {
        if(!playersConfig){
            return 0;
        }
        if(true !== playersConfig.enabled){
            return 0;
        }
        let recoverySettings = {
            amounts: playersConfig.properties,
            persistEveryTicks: Number(
                playersConfig.persistEveryTicks || ActionsConst.AUTO_RECOVERY.DEFAULTS.PERSIST_EVERY_TICKS
            ),
            startDelayMs: Number(playersConfig.startDelayMs || ActionsConst.AUTO_RECOVERY.DEFAULTS.START_DELAY_MS),
            onlyOutOfBattle: Boolean(sc.get(playersConfig, 'onlyOutOfBattle', true)),
            now
        };
        let recoveredPlayers = 0;
        for(let sessionId of room.playersKeysFromState()){
            let playerSchema = room.playerBySessionIdFromState(sessionId);
            if(await this.recoverPlayer(room, playerSchema, recoverySettings)){
                recoveredPlayers++;
            }
        }
        return recoveredPlayers;
    }

    /**
     * @param {Object} room
     * @param {Object} playerSchema
     * @param {Object} recoverySettings
     * @param {Object} recoverySettings.amounts
     * @param {number} recoverySettings.persistEveryTicks
     * @param {number} recoverySettings.startDelayMs
     * @param {boolean} recoverySettings.onlyOutOfBattle
     * @param {number} recoverySettings.now
     * @returns {Promise<boolean>}
     */
    async recoverPlayer(room, playerSchema, recoverySettings)
    {
        if(!this.isRecoverablePlayer(playerSchema)){
            return false;
        }
        let client = room.getClientById(playerSchema.sessionId);
        if(!client){
            return false;
        }
        let recoveredProperties = StatsRecoveryCalculator.recover(
            playerSchema.stats,
            playerSchema.statsBase,
            recoverySettings.amounts,
            this.fetchRecoveryState(playerSchema),
            {
                startDelayMs: recoverySettings.startDelayMs,
                now: recoverySettings.now,
                inBattle: recoverySettings.onlyOutOfBattle && this.isPlayerInBattle(room, playerSchema)
            }
        );
        if(0 === recoveredProperties.length){
            return false;
        }
        let recoveryTicks = Number(playerSchema.getPrivate(ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.TICKS)) + 1;
        if(recoveryTicks >= recoverySettings.persistEveryTicks){
            playerSchema.setPrivate(ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.TICKS, 0);
            return await room.savePlayerStats(playerSchema, client);
        }
        playerSchema.setPrivate(ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.TICKS, recoveryTicks);
        await this.events.emit('reldens.savePlayerStatsUpdateClient', client, playerSchema, room);
        client.send('*', {act: GameConst.PLAYER_STATS, stats: playerSchema.stats, statsBase: playerSchema.statsBase});
        return true;
    }

    /**
     * @param {Object} playerSchema
     * @returns {Object}
     */
    fetchRecoveryState(playerSchema)
    {
        let recoveryState = playerSchema.getPrivate(ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.STATE);
        if(recoveryState){
            return recoveryState;
        }
        return playerSchema.setPrivate(ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.STATE, {lastValues: {}, loweredAt: {}});
    }

    /**
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isPlayerInBattle(room, playerSchema)
    {
        if(0 < Object.keys(sc.get(playerSchema.actions?.pvp, 'inBattleWith', {})).length){
            return true;
        }
        let roomObjects = sc.get(room.objectsManager, 'roomObjects', {});
        for(let objectIndex of Object.keys(roomObjects)){
            if(sc.hasOwn(roomObjects[objectIndex]?.battle?.inBattleWithPlayers, playerSchema.player_id)){
                return true;
            }
        }
        for(let sessionId of room.playersKeysFromState()){
            if(this.isPvpTarget(room.playerBySessionIdFromState(sessionId), playerSchema.sessionId)){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Object} attackerSchema
     * @param {string} targetSessionId
     * @returns {boolean}
     */
    isPvpTarget(attackerSchema, targetSessionId)
    {
        let attackerBattles = sc.get(attackerSchema?.actions?.pvp, 'inBattleWith', {});
        for(let targetKey of Object.keys(attackerBattles)){
            if(targetSessionId === attackerBattles[targetKey]?.target?.sessionId){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isRecoverablePlayer(playerSchema)
    {
        if(!playerSchema){
            return false;
        }
        if(!playerSchema.stats){
            return false;
        }
        if(playerSchema.physicalBody?.isChangingScene){
            return false;
        }
        if(playerSchema.isDeath()){
            return false;
        }
        return !playerSchema.isDisabled();
    }

}

module.exports.PlayersAutoRecovery = PlayersAutoRecovery;
