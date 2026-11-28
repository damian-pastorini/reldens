/**
 *
 * Reldens - Battles Loaded Config
 *
 * The game over time every battle reads once from the config when it is created (the Pvp of each player, built from
 * the actions PlayerEnricher battle config, and the Pve of each enemy) is set again from the current config on the
 * live battles of every created scene room and on the PlayerEnricher battle config of the next joins, like the server
 * restart that reads it again, so a game over time override or restore reaches the next death.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { ActionsConst } = require('../../../lib/actions/constants');

class BattlesLoadedConfig
{

    static applyGameOverTimeOut(serverManager)
    {
        let gameOverTimeOut = serverManager.configManager.getWithoutLogs(
            ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT,
            ActionsConst.DEATH.DEFAULTS.GAME_OVER_TIME_OUT
        );
        serverManager.featuresManager.featuresList.actions.package.playerEnricher.pvpConfig.gameOverTimeOut = gameOverTimeOut;
        let battles = [];
        for(let room of RoomObjectsState.fetchRooms(serverManager.roomsManager, false)){
            if(room.roomWorld){
                battles.push(...BattlesLoadedConfig.fetchRoomBattles(room));
            }
        }
        for(let battle of battles){
            battle.gameOverTimeOut = gameOverTimeOut;
        }
        return battles.length;
    }

    static fetchRoomBattles(room)
    {
        let battles = RoomObjectsState.fetchEnemies(room).map(enemyObject => enemyObject.battle);
        for(let sessionId of room.playersKeysFromState()){
            let playerBattle = room.playerBySessionIdFromState(sessionId)?.actions?.pvp;
            if(playerBattle){
                battles.push(playerBattle);
            }
        }
        return battles;
    }

}

module.exports.BattlesLoadedConfig = BattlesLoadedConfig;
