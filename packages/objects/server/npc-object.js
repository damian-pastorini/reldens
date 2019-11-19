/**
 *
 * Reldens - NpcObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { BaseObject } = require('./base-object');
const { Logger } = require('../../game/logger');

class NpcObject extends BaseObject
{

    constructor(props)
    {
        super(props);
        // this is a hardcoded property for this specific object type:
        this.isNpc = true;
        this.hasAnimation = true;
        this.hasMass = 1;
        this.collisionResponse = true;
        // the actions will be false as default:
        this.runOnHit = false;
        this.runOnAction = false;
    }

    onHit(props)
    {
        if(!this.runOnHit || !props.room){
            return;
        }
        let client = props.room.getClientById(props.playerBody.playerId);
        if(!client){
            Logger.error('Object hit, client not found by playerId: ' + props.playerBody.playerId);
        } else {
            props.room.send(client, this.animationData);
        }
    }

    onAction(props)
    {
        if(!this.runOnAction || !props.room) {
            return;
        }
        let client = props.room.getClientById(props.playerBody.playerId);
        if(!client){
            Logger.error('Object action, client not found by playerId: ' + props.playerBody.playerId);
        } else {
            props.room.send(client, this.animationData);
        }
    }

}

module.exports = NpcObject;
