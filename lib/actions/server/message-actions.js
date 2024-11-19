/**
 *
 * Reldens - ActionsMessageActions
 *
 */

const { GameConst } = require('../../game/constants');
const { ActionsConst } = require('../../actions/constants');
const { ObjectsConst } = require('../../objects/constants');
const { Logger, sc } = require('@reldens/utils');

class ActionsMessageActions
{

    async executeMessageActions(client, data, room, playerSchema)
    {
        let bodyToMove = playerSchema.physicalBody;
        if(playerSchema.isCasting || bodyToMove.isBlocked || bodyToMove.isChangingScene){
            // if body is blocked do NOTHING! it could be because a scene change, or a skill activation or an item
            return false;
        }
        if(playerSchema.isDeath() || playerSchema.isDisabled()){
            return false;
        }
        if(ActionsConst.ACTION !== data.act || !data.target){
            return false;
        }
        let validTarget = this.validateTarget(data.target, room);
        if(!validTarget){
            return false;
        }
        let currentAction = this.preparePlayerCurrentAction(playerSchema, data);
        if(!currentAction){
            return false;
        }
        // run skill validations (range, time, conditions, etc):
        if(!currentAction.validateRange(validTarget) || !currentAction.validate()){
            return false;
        }
        currentAction.room = room;
        if(data.target.type === GameConst.TYPE_PLAYER && playerSchema.actions['pvp']){
            await playerSchema.actions['pvp'].runBattle(playerSchema, validTarget, room);
        }
        if(data.target.type === ObjectsConst.TYPE_OBJECT && sc.hasOwn(validTarget, 'battle')){
            await validTarget.battle.runBattle(playerSchema, validTarget, room);
        }
    }

    preparePlayerCurrentAction(playerSchema, data)
    {
        let runAction = data.type;
        let playerAction = sc.get(playerSchema.actions, runAction, false);
        let classPathSkill = sc.get(playerSchema.skillsServer.classPath.currentSkills, runAction, false);
        // @NOTE: actions could be anything the player will apply on the target, for example an action button
        // could send the type "dig", and that will run an action that will make the player "find something".
        // For that matter the action could always validate the target as true anywhere on the ground, so the
        // current position / layer on the map could be validated.
        // On the other hand skills have their own behavior and in most of the cases it will trigger a battle.
        // Skills come from a specific system to which we have direct access from here.
        if(!runAction || (!playerAction && !classPathSkill)){
            Logger.error('Action not available:', runAction, data);
            return false;
        }
        playerSchema.currentAction = runAction;
        // if one is not available because of the condition above the other will be:
        return playerAction ? playerAction : classPathSkill;
    }

    validateTarget(target, room)
    {
        let validTarget = false;
        if(target.type === GameConst.TYPE_PLAYER){
            validTarget = room.playerBySessionIdFromState(target.id);
        }
        if(target.type === ObjectsConst.TYPE_OBJECT){
            validTarget = room.objectsManager.roomObjects[target.id];
        }
        if(target.type === ActionsConst.TARGET_POSITION){
            validTarget = target;
        }
        return validTarget;
    }

}

module.exports.ActionsMessageActions = ActionsMessageActions;
