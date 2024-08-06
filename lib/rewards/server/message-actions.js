/**
 *
 * Reldens - RewardMessageActions
 *
 */

const { ObjectsConst } = require('../../objects/constants');
const { PickUpObject } = require('./pick-up-object');
const { Logger, sc } = require('@reldens/utils');

class RewardMessageActions
{

    constructor(targetDeterminer)
    {
        this.targetDeterminer = targetDeterminer;
    }

    async executeMessageActions(client, message, room, playerSchema)
    {
        if(!sc.hasOwn(message, 'act') || !sc.hasOwn(message, 'type')){
            return false;
        }
        if(ObjectsConst.OBJECT_INTERACTION !== message.act || ObjectsConst.DROPS.PICK_UP_ACT !== message.type){
            return false;
        }
        let objectId = sc.get(message, 'id', false);
        if(!objectId){
            Logger.warning('A drop type message was received but without id.', message);
            return false;
        }
        let roomObject = sc.get(room.roomWorld.objectsManager.roomObjects, objectId, false);
        if(!roomObject){
            Logger.error('Could not found object with ID "'+objectId+'" on roomObjects.', message);
            // @TODO - BETA - Check if we need to send a message to the client with the removed item.
            return false;
        }
        if(!roomObject.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
            return false;
        }
        let eventData = {roomObject, client, room, playerSchema, continueEvent: true};
        await room.events.emit('reldens.beforeRemovingDroppedReward', eventData);
        if(!eventData.continueEvent){
            return false;
        }
        return await PickUpObject.execute(roomObject, room, playerSchema, this.targetDeterminer);
    }

}

module.exports.RewardMessageActions = RewardMessageActions;
