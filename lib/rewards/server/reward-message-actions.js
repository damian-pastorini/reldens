/**
 *
 * Reldens - RewardMessageActions
 *
 * Handles client messages for picking up dropped reward items, validating player state and object interactions.
 *
 */

const { ObjectsConst } = require('../../objects/constants');
const { PickUpObject } = require('./pick-up-object');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./target-determiner').TargetDeterminer} TargetDeterminer
 */
class RewardMessageActions
{

    /**
     * @param {TargetDeterminer} targetDeterminer
     */
    constructor(targetDeterminer)
    {
        /** @type {TargetDeterminer} */
        this.targetDeterminer = targetDeterminer;
    }

    /**
     * @param {Object} client
     * @param {Object} message
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<boolean>}
     */
    async executeMessageActions(client, message, room, playerSchema)
    {
        if(!sc.hasOwn(message, 'act') || !sc.hasOwn(message, 'type')){
            return false;
        }
        if(ObjectsConst.OBJECT_INTERACTION !== message.act || ObjectsConst.DROPS.PICK_UP_ACT !== message.type){
            return false;
        }
        if(playerSchema.isDeath() || playerSchema.isDisabled()){
            return false;
        }
        let objectId = sc.get(message, 'id', false);
        if(!objectId){
            Logger.warning('A drop type message was received but without id.', message);
            return false;
        }
        let roomObject = sc.get(room.roomWorld.objectsManager.roomObjects, objectId, false);
        if(!roomObject){
            Logger.warning('Could not found object with ID "'+objectId+'" on roomObjects.', message);
            room.broadcast('*', {act: ObjectsConst.DROPS.REMOVE, id: objectId});
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
