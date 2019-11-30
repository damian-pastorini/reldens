/**
 *
 * Reldens - AnimationObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { BaseObject } = require('./base-object');
const { GameConst } = require('../../game/constants');
const { Logger } = require('../../game/logger');

class AnimationObject extends BaseObject
{

    // object type:
    isAnimation = true;
    // the actions will be false as default:
    runOnHit = false;
    runOnAction = false;

    constructor(props)
    {
        super(props);
    }

    get animationData()
    {
        return {
            act: GameConst.OBJECT_ANIMATION,
            key: this.key,
            clientParams: this.clientParams,
            x: this.x,
            y: this.y
        };
    }

    onHit(props)
    {
        if(!this.runOnHit || !props.room) {
            return;
        }
        if({}.hasOwnProperty.call(this, 'playerVisible') && this.roomVisible){
            let client = props.room.getClientById(props.playerBody.playerId);
            if(!client){
                Logger.error('Object hit, client not found by playerId:', props.playerBody.playerId);
            } else {
                props.room.send(client, this.animationData);
            }
        }
        if({}.hasOwnProperty.call(this, 'roomVisible') && this.roomVisible){
            // run for everyone in the room:
            props.room.broadcast(this.animationData);
        }
    }

    onAction(props)
    {
        if(!this.runOnAction || !props.room) {
            return;
        }
        if({}.hasOwnProperty.call(this, 'playerVisible') && this.roomVisible){
            // run only for the client who executed:
            let client = props.room.getClientById(props.playerBody.playerId);
            if(!client){
                Logger.error(['Object action, client not found by playerId:', props.playerBody.playerId]);
            } else {
                props.room.send(client, this.animationData);
            }
        }
        if({}.hasOwnProperty.call(this, 'roomVisible') && this.roomVisible){
            // run for everyone in the room:
            props.room.broadcast(this.animationData);
        }
    }

}

module.exports = AnimationObject;
