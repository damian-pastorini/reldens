/**
 *
 * Reldens - MessageActions
 *
 * Server side messages actions.
 *
 */

const { Logger, EventsManager } = require('@reldens/utils');
const { GameConst } = require('../../game/constants');
const { ActionsConst } = require('../../actions/constants');
const { ObjectsConst } = require('../../objects/constants');

class ActionsMessageActions
{

    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        if(data.act === GameConst.ACTION && data.target){
            let validTarget = this.validateTarget(data.target, room);
            if(validTarget){
                EventsManager.emit('reldens.onMessageRunAction', data, playerSchema, validTarget, room)
                    .catch((err) => {
                        Logger.error(['Listener error on onMessageRunAction:', err]);
                    });
            }
        }
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

module.exports.ActionsMessageActions = new ActionsMessageActions();
