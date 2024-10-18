/**
 *
 * Reldens - PvP
 *
 */

const { Battle } = require('./battle');
const { Logger } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');

class Pvp extends Battle
{

    async runBattle(playerSchema, target, room)
    {
        if(GameConst.STATUS.ACTIVE !== playerSchema.state.inState){
            Logger.info('PvP inactive player.', playerSchema.state.inState);
            return false;
        }
        if(GameConst.STATUS.ACTIVE !== target.state.inState){
            Logger.info('PvP inactive target.', target.state.inState);
            return false;
        }
        // @TODO - BETA - Make PvP available by configuration.
        // can't fight with yourself:
        if(playerSchema.sessionId === target.sessionId){
            await this.executeAction(playerSchema, target);
            return false;
        }
        // @NOTE: run battle method is for when the player attacks a target.
        let inBattle = await super.runBattle(playerSchema, target, room);
        if(!inBattle){
            return false;
        }
        let targetClient = room.getClientById(target.sessionId);
        if(targetClient){
            await this.updateTargetClient(targetClient, target, playerSchema.sessionId, room, playerSchema);
        }
        return true;
    }

    async executeAction(playerSchema, target)
    {
        let currentAction = this.getCurrentAction(playerSchema);
        if(!currentAction){
            Logger.error('Actions not defined for this player. ID: '+playerSchema.player_id);
            return false;
        }
        // @TODO - BETA - Move self target validation to skills npm package.
        if(!currentAction.allowSelfTarget){
            return false;
        }
        currentAction.currentBattle = this;
        await currentAction.execute(target);
        return false;
    }

}

module.exports.Pvp = Pvp;
