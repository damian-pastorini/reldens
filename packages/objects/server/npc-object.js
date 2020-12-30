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
        this.eventsPrefix = 'npc';
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
        this.sendInvalidOptionMessage = false;
        this.invalidOptionMessage = 'I do not understand.';
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
            if(Object.keys(this.options).length > 0){
                // @TODO - BETA.17: extend feature to generate different flows, this will help on easily create quests,
                //   for example we could request confirmation about a choice.
                activationData.options = this.options;
            }
            room.send(client, activationData);
        }
    }

    isValidOption(data)
    {
        return !(data.act !== GameConst.BUTTON_OPTION || data.id !== this.id);
    }

    isValidIndexValue(optionIdx, room, client)
    {
        if(!{}.hasOwnProperty.call(this.options, optionIdx)){
            if(this.sendInvalidOptionMessage){
                room.send(client, {act: GameConst.UI, id: this.id, content: this.invalidOptionMessage});
            }
            return false;
        }
        return true;
    }

}

module.exports.NpcObject = NpcObject;
