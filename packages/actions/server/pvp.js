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
        // @NOTE: run battle method is for when the player attacks a target.
        let inBattle = await super.runBattle(player, target);
        if(!inBattle){
            return;
        }
        let targetClient = room.getClientById(target.sessionId);
        if(targetClient){
            await this.updateTargetClient(targetClient, target, player.sessionId, room);
        }
    }

}

module.exports.Pvp = Pvp;
