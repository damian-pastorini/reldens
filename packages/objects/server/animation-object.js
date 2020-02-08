/**
 *
 * Reldens - AnimationObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { BaseObject } = require('./base-object');
const { ObjectsConst } = require('../constants');
const { Logger } = require('../../game/logger');

class AnimationObject extends BaseObject
{

    constructor(props)
    {
        super(props);
        // object type:
        this.type = ObjectsConst.TYPE_ANIMATION;
        this.clientParams.type = this.type;
        this.isAnimation = true;
        // the actions will be false as default:
        this.runOnHit = false;
        this.runOnAction = false;
        this.objectBody = false;
    }

    get animationData()
    {
        return {
            act: this.type,
            key: this.key,
            clientParams: this.clientParams,
            x: this.x,
            y: this.y
        };
    }

    onHit(props)
    {
        if(!this.runOnHit || !props.room){
            return;
        }
        if({}.hasOwnProperty.call(this, 'playerVisible') && this.playerVisible){
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
        if(!this.runOnAction || !props.room){
            return;
        }
        if({}.hasOwnProperty.call(this, 'playerVisible') && this.playerVisible){
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

    chasePlayer(playerSchema)
    {
        if(!this.objectBody || !playerSchema.physicalBody){
            Logger.error(['Body not found.', 'Object:', this.objectBody, 'Player:', playerSchema.physicalBody]);
        }
    }

}

module.exports.AnimationObject = AnimationObject;
