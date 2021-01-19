/**
 *
 * Reldens - MessageActions
 *
 * Server side messages actions.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');
const { ActionsConst } = require('../../actions/constants');
const { ObjectsConst } = require('../../objects/constants');

class ActionsMessageActions
{

    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        let bodyToMove = playerSchema.physicalBody;
        if(playerSchema.isCasting || bodyToMove.isBlocked || bodyToMove.isChangingScene){
            // if body is blocked do NOTHING! it could be because a scene change, or a skill activation or an item
            return false;
        }
        if(data.act === ActionsConst.ACTION && data.target){
            let validTarget = this.validateTarget(data.target, room);
            if(validTarget){
                let currentAction = this.preparePlayerCurrentAction(playerSchema, data);
                if(!currentAction){
                    return false;
                }
                // run skill validations (range, time, conditions, etc):
                if(!currentAction.validateRange(validTarget) || !currentAction.validate()){
                    return false;
                }
                // set the room:
                currentAction.room = room;
                // @TODO - BETA.17 - Make default action with players configurable, temporally it will be a basic
                //   attack.
                if(data.target.type === GameConst.TYPE_PLAYER){
                    playerSchema.actions['pvp'].runBattle(playerSchema, validTarget, room);
                }
                if(data.target.type === ObjectsConst.TYPE_OBJECT && sc.hasOwn(validTarget, 'battle')){
                    validTarget.battle.runBattle(playerSchema, validTarget, room);
                }

            }
        }
    }

    preparePlayerCurrentAction(playerSchema, data)
    {
        let runAction = data.type;
        if(
            !runAction ||
            (
                // @NOTE: actions could be anything the player will apply on the target, for example an action button
                // could send the type "dig", and that will run an action that will make the player "find something".
                // For that matter the action could always validate the target as true anywhere on the ground, so the
                // current position / layer on the map could be validated. On the other hand skills have their own
                // behavior and in most of the cases will trigger a battle, these comes from an specific system though
                // access directly from there.
                !sc.hasOwn(playerSchema.actions, runAction)
                && !sc.hasOwn(playerSchema.skillsServer.classPath.currentSkills, runAction)
            )
        ){
            Logger.error(['Action not available:', runAction]);
            return false;
        }
        playerSchema.currentAction = runAction;
        return playerSchema.actions[runAction] ?
            playerSchema.actions[runAction] : playerSchema.skillsServer.classPath.currentSkills[runAction];
    }

    validateTarget(target, room)
    {
        let validTarget = false;
        if(target.type === GameConst.TYPE_PLAYER){
            validTarget = room.getPlayerFromState(target.id);
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
