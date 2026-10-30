/**
 *
 * Reldens - TeleportObject
 *
 * NPC that relocates the players to one of the destination rooms of its dialog options. The options labels come from
 * the client_params "options" and the destinations from the private_params "destinations", keyed by the same option
 * key, so the client only sends the option key and never a room name or a position. A dead or disabled player is never
 * relocated, the dialog is closed instead.
 *
 */

const { NpcObject } = require('./npc-object');
const { PlayerRelocator } = require('../../../../rooms/server/player-relocator');
const { GameConst } = require('../../../../game/constants');
const { ObjectsConst } = require('../../../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../../rooms/server/scene').RoomScene} RoomScene
 */
class TeleportObject extends NpcObject
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super(props);
        this.type = ObjectsConst.TYPE_TELEPORT;
        this.eventsPrefix = this.uid+'.'+ObjectsConst.EVENT_PREFIX.TELEPORT;
        /** @type {Object<string, Object>} */
        this.destinations = sc.get(this, 'destinations', {});
        /** @type {string} */
        this.invalidDestinationMessage = sc.get(
            this,
            'invalidDestinationMessage',
            ObjectsConst.DEFAULTS.TELEPORT_OBJECT.INVALID_DESTINATION_MESSAGE
        );
    }

    /**
     * @param {Object} client
     * @param {Object} data
     * @param {RoomScene} room
     * @param {Object} playerSchema
     * @returns {Promise<boolean|undefined>}
     */
    async executeMessageActions(client, data, room, playerSchema)
    {
        let superResult = await super.executeMessageActions(client, data, room, playerSchema);
        if(false === superResult){
            return false;
        }
        if(!this.isObjectOptionInteractionMessage(data)){
            return superResult;
        }
        if(!this.isPlayerActive(playerSchema)){
            client.send('*', {act: GameConst.CLOSE_UI_ACTION, id: this.id});
            return false;
        }
        let destination = sc.get(this.destinations, data.value, false);
        if(!destination){
            this.randomMovementBehavior?.resumeAfterInteraction(client.sessionId);
            client.send('*', {act: GameConst.CLOSE_UI_ACTION, id: this.id});
            return false;
        }
        if(!this.isValidDestination(destination, client, room)){
            client.send('*', {act: GameConst.UI, id: this.id, content: this.invalidDestinationMessage});
            return false;
        }
        client.send('*', {act: GameConst.CLOSE_UI_ACTION, id: this.id});
        return await new PlayerRelocator(room).relocate(client, playerSchema, destination.room, destination);
    }

    /**
     * @param {Object} playerSchema
     * @returns {boolean}
     */
    isPlayerActive(playerSchema)
    {
        if(playerSchema.isDeath()){
            return false;
        }
        return !playerSchema.isDisabled();
    }

    /**
     * @param {Object|boolean} destination
     * @param {Object} client
     * @param {RoomScene} room
     * @returns {boolean}
     */
    isValidDestination(destination, client, room)
    {
        if(!sc.isObject(destination)){
            return false;
        }
        if(!sc.isString(destination.room)){
            return false;
        }
        return room.validateRoom(destination.room, room.loginManager.isGuestUser(client.auth), true);
    }

}

module.exports.TeleportObject = TeleportObject;
