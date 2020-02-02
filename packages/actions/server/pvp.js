/**
 *
 * Reldens - PvP
 *
 * Player vs player battle logic handler.
 *
 */

const { Battle } = require('./battle');
const { GameConst } = require('../../game/constants');

class Pvp extends Battle
{

    constructor(props)
    {
        super();
        this.battleTimeOff = props.battleTimeOff || false;
        this.timerType = props.timerType || false;
    }

    async runBattle(player, target, room)
    {
        console.log('Start PvP!');
        let inBattle = await super.runBattle(player, target);
        if(!inBattle){
            return;
        }
        let targetClient = room.getClientById(target.sessionId);
        if(targetClient){
            room.broadcast({
                act: GameConst.ATTACK,
                atk: player.sessionId,
                def: target.sessionId
            });
            if(target.stats.hp === 0){
                // player is dead! reinitialize the stats:
                target.stats = target.initialStats;
                // save the stats:
                await room.savePlayerStats(target);
                await room.saveStateAndRemovePlayer(target.sessionId);
                room.send(targetClient, {act: GameConst.GAME_OVER});
            } else {
                await room.savePlayerStats(target);
                // update the target:
                room.send(targetClient, {act: GameConst.PLAYER_STATS, stats: target.stats});
            }
        }
    }

}

module.exports.Pvp = Pvp;
