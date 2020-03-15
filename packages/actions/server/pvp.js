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

    // @TODO: make pvp available by configuration.
    async runBattle(player, target, battleType, room)
    {
        // @NOTE: run battle method is for when the player attacks a target.
        let inBattle = await super.runBattle(player, target, battleType, room);
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
