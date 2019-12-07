/**
 *
 * Reldens - NpcObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { BaseObject } = require('./base-object');
const { Logger } = require('../../game/logger');
const { ObjectsConst } = require('../constants');

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
        this.listenMessages = true;
        // interactive objects will react on click:
        this.clientParams.isInteractive = true;
        // @NOTE: interaction area is how far the player can be from the object to validate the actions on click, this
        // area will be the valid-margin surrounding the object.
        this.interactionArea = 64;
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
        if(!this.runOnAction || !props.room){
            return;
        }
        let client = props.room.getClientById(props.playerBody.playerId);
        if(!client){
            Logger.error('Object action, client not found by playerId: ' + props.playerBody.playerId);
        } else {
            props.room.send(client, this.animationData);
        }
    }

    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        // validate for object interaction, object id and interaction area:
        if(
            data.act === ObjectsConst.OBJECT_INTERACTION
            && data.id === this.id
            && this.isValidInteraction(playerSchema.state.x, playerSchema.state.y)
        ){
            // room.send(client);
        }
    }

}

module.exports.NpcObject = NpcObject;
