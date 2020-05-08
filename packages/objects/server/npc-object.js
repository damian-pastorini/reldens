/**
 *
 * Reldens - NpcObject
 *
 * This is a base object class, AnimationsObject class will only send the run animation action to the client.
 *
 */

const { AnimationObject } = require('./animation-object');
const { GameConst } = require('../../game/constants');
const { ObjectsConst } = require('../constants');

class NpcObject extends AnimationObject
{

    constructor(props)
    {
        super(props);
        // this is a hardcoded property for this specific object type:
        this.type = ObjectsConst.TYPE_NPC;
        this.isAnimation = true;
        this.hasAnimation = true;
        this.hasMass = 1;
        this.collisionResponse = true;
        // the actions will be false as default:
        this.runOnHit = false;
        this.runOnAction = false;
        this.listenMessages = true;
        // interactive objects will react on click:
        this.clientParams.type = ObjectsConst.TYPE_NPC;
        this.clientParams.isInteractive = true;
        // @NOTE: interaction area is how far the player can be from the object to validate the actions on click, this
        // area will be the valid-margin surrounding the object.
        this.interactionArea = this.config.get('server/objects/actions/interactionsDistance');
        this.options = {};
    }

    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        // validate for object interaction, object id and interaction area:
        if(
            {}.hasOwnProperty.call(data, 'act')
            && data.act === ObjectsConst.OBJECT_INTERACTION
            && data.id === this.id
            && this.isValidInteraction(playerSchema.state.x, playerSchema.state.y)
        ){
            let activationData = {act: GameConst.UI, id: this.id};
            if(this.title){
                activationData.title = this.title;
            }
            if(this.content){
                activationData.content = this.content;
            }
            if(Object.entries(this.options).length > 0){
                activationData.options = {};
                for(let idx in this.options){
                    let option = this.options[idx];
                    activationData.options[idx] = {label: option.label, value: option.value};
                }
            }
            room.send(client, activationData);
        }
    }

}

module.exports.NpcObject = NpcObject;
