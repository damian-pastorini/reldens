/**
 *
 * Reldens - PvP
 *
 * Player vs player battle logic handler.
 *
 */

const { Battle } = require('./battle');

class Pvp extends Battle
{

    async runBattle(player, target, room)
    {
        // @TODO - BETA.17: make pvp available by configuration.
        // can't fight with yourself:
        if(player.sessionId === target.sessionId){
            return false;
        }
        // @NOTE: run battle method is for when the player attacks a target.
        let inBattle = await super.runBattle(player, target, room);
        if(!inBattle){
            return false;
        }
        let targetClient = room.getClientById(target.sessionId);
        if(targetClient){
            await this.updateTargetClient(targetClient, target, player.sessionId, room);
        }
        return true;
    }

}

module.exports.Pvp = Pvp;
