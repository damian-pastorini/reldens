/**
 *
 * Reldens - Theme - PlayersAutoRecovery
 *
 * Recovers the configured stats of the alive players of a room on every tick, up to their base values. The client stats
 * and the life bars are refreshed on every recovery and the stats are saved in the storage every "persistEveryTicks"
 * recoveries, the leave, the death and the scene change save them as usual.
 *
 */

const { StatsRecoveryCalculator } = require('./stats-recovery-calculator');
const { ActionsConst } = require('reldens/lib/actions/constants');
const { GameConst } = require('reldens/lib/game/constants');

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
     * @returns {Promise<number>}
     */
    async recoverRoomPlayers(room, playersConfig)
    {
        if(!playersConfig){
            return 0;
        }
        if(true !== playersConfig.enabled){
            return 0;
        }
        let persistEveryTicks = Number(
            playersConfig.persistEveryTicks || ActionsConst.AUTO_RECOVERY.DEFAULTS.PERSIST_EVERY_TICKS
        );
        let recoveredPlayers = 0;
        for(let sessionId of room.playersKeysFromState()){
            let playerSchema = room.playerBySessionIdFromState(sessionId);
            if(await this.recoverPlayer(room, playerSchema, playersConfig.properties, persistEveryTicks)){
                recoveredPlayers++;
            }
        }
        return recoveredPlayers;
    }

    /**
     * @param {Object} room
     * @param {Object} playerSchema
     * @param {Object} amounts
     * @param {number} persistEveryTicks
     * @returns {Promise<boolean>}
     */
    async recoverPlayer(room, playerSchema, amounts, persistEveryTicks)
    {
        if(!this.isRecoverablePlayer(playerSchema)){
            return false;
        }
        let client = room.getClientById(playerSchema.sessionId);
        if(!client){
            return false;
        }
        let recoveredProperties = StatsRecoveryCalculator.recover(playerSchema.stats, playerSchema.statsBase, amounts);
        if(0 === recoveredProperties.length){
            return false;
        }
        let recoveryTicks = Number(playerSchema.getPrivate(ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.TICKS)) + 1;
        if(recoveryTicks >= persistEveryTicks){
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
