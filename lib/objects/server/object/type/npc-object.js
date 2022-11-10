/**
 *
 * Reldens - NpcObject
 *
 */

const { AnimationObject } = require('./animation-object');
const { GameConst } = require('../../../../game/constants');
const { ObjectsConst } = require('../../../constants');
const { Logger, sc } = require('@reldens/utils');

class NpcObject extends AnimationObject
{

    constructor(props)
    {
        super(props);
        // this is a hardcoded property for this specific object type:
        this.type = ObjectsConst.TYPE_NPC;
        this.hasAnimation = true;
        this.collisionResponse = true;
        this.eventsPrefix = 'npc';
        this.listenMessages = true;
        // interactive objects will react on click:
        this.clientParams.type = ObjectsConst.TYPE_NPC;
        this.clientParams.isInteractive = true;
        // @NOTE: interaction area is how far the player can be from the object to validate the actions on click, this
        // area will be the valid-margin surrounding the object.
        this.interactionArea = this.config.get('server/objects/actions/interactionsDistance');
        this.sendInvalidOptionMessage = false;
        let defaultMessage = this.config.get('client/objects/npc/invalidOptionMessage');
        this.invalidOptionMessage = defaultMessage || ObjectsConst.DEFAULTS.NPC_OBJECT.INVALID_MESSAGE;
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        // validate for object interaction, object id and interaction area:
        if(false === this.isValidId(data)){
            return false;
        }
        let isObjectOptionInteractionMessage = this.isObjectOptionInteractionMessage(data);
        if(false === this.isObjectInteractionMessage(data) && false === isObjectOptionInteractionMessage){
            return false;
        }
        if(true === isObjectOptionInteractionMessage && false === this.isValidOptionIndexValue(data.value, client)){
            Logger.error('Object "'+this.key+'" invalid option "'+data.value+'" from client "'+client.sessionId+'"');
            return false;
        }
        if(false === this.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
            return false;
        }
        let activationData = {act: GameConst.UI, id: this.id};
        if(this.title){
            activationData.title = this.title;
        }
        if(this.content){
            activationData.content = this.content;
        }
        if(0 < Object.keys(this.options).length){
            // @TODO - BETA - Extend feature to generate different flows, this will help on easily create quests, for
            //   example we could request confirmation about a choice.
            activationData.options = this.options;
        }
        client.send('*', activationData);
    }

    isValidId(data)
    {
        return Number(this.id) === Number(sc.get(data, 'id', false));
    }

    isObjectInteractionMessage(data)
    {
        return (ObjectsConst.OBJECT_INTERACTION).toString() === (sc.get(data, 'act', '')).toString();
    }

    isObjectOptionInteractionMessage(data)
    {
        return (GameConst.BUTTON_OPTION).toString() === (sc.get(data, 'act', '')).toString();
    }

    isValidOptionIndexValue(optionIdx, client)
    {
        if(sc.hasOwn(this.options, optionIdx)){
            return true;
        }
        if(this.sendInvalidOptionMessage){
            client.send('*', {act: GameConst.UI, id: this.id, content: this.invalidOptionMessage});
        }
        return false;
    }

}

module.exports.NpcObject = NpcObject;
