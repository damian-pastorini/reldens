/**
 *
 * Reldens - PvP
 *
 * Player vs player battle logic handler.
 *
 */

const { Battle } = require('./battle');
const { Logger } = require('@reldens/utils');

class Pvp extends Battle
{

    async runBattle(player, target, room)
    {
        // @TODO - BETA.17: make pvp available by configuration.
        // can't fight with yourself:
        if(player.sessionId === target.sessionId){
            await this.executeAction(player, target);
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

    async executeAction(playerSchema, target)
    {
        let currentAction = this.getCurrentAction(playerSchema);
        if(!currentAction){
            Logger.error(['Actions not defined for this player.', 'ID:', playerSchema.player_id]);
            return false;
        }
        // @TODO - BETA.17 - Move self target validation to skills npm package.
        if(!currentAction.allowSelfTarget){
            return false;
        }
        currentAction.currentBattle = this;
        await currentAction.execute(target);
        return false;
    }

}

module.exports.Pvp = Pvp;
