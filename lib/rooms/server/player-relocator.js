/**
 *
 * Reldens - PlayerRelocator
 *
 * Moves a player to a room and a position decided by the server, without a change point: another room runs the same
 * flow of a change point (the room availability check, the player state saved, the changing scene broadcast and the
 * reconnect message) and the same room places the player body on the new position. Without a position the destination
 * room default return point is used. A failed state save restores the previous state and the client is never told to
 * change the scene, so the player stays visible in the current room. The player body and its scene change flag are
 * checked again after the destination room load, since another relocation or a change point could start meanwhile,
 * and the flag is set with no wait after that check, so overlapping calls run a single scene change.
 *
 */

const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./scene').RoomScene} RoomScene
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('../../users/server/player').Player} Player
 */
class PlayerRelocator
{

    /**
     * @param {RoomScene} room
     */
    constructor(room)
    {
        /** @type {RoomScene} */
        this.room = room;
        /** @type {Array<string>} */
        this.validDirections = [GameConst.UP, GameConst.LEFT, GameConst.DOWN, GameConst.RIGHT];
    }

    /**
     * @param {Client} client
     * @param {Player} playerSchema
     * @param {string} destinationRoomName
     * @param {Object|boolean} [destinationPosition]
     * @returns {Promise<boolean>}
     */
    async relocate(client, playerSchema, destinationRoomName, destinationPosition = false)
    {
        if(!this.isRelocatable(playerSchema)){
            return false;
        }
        let destinationRoom = await this.room.loginManager.roomsManager.loadRoomByName(destinationRoomName);
        if(!destinationRoom){
            Logger.error('Relocation room not found: '+destinationRoomName);
            return false;
        }
        if(!this.isRelocatable(playerSchema)){
            return false;
        }
        let newState = this.mapDestinationState(destinationRoom, destinationPosition);
        if(this.room.roomName === destinationRoomName){
            return await this.relocateInRoom(client, playerSchema, newState);
        }
        return await this.relocateToRoom(client, playerSchema, destinationRoomName, newState);
    }

    /**
     * @param {Player} playerSchema
     * @returns {boolean}
     */
    isRelocatable(playerSchema)
    {
        let playerBody = sc.get(playerSchema, 'physicalBody', false);
        if(!playerBody){
            Logger.warning('Player body not found to relocate the player "'+playerSchema.player_id+'".');
            return false;
        }
        if(playerBody.isChangingScene){
            Logger.info('Player "'+playerSchema.player_id+'" is already changing the scene, relocation skipped.');
            return false;
        }
        return true;
    }

    /**
     * @param {Object} destinationRoom
     * @param {Object|boolean} destinationPosition
     * @returns {Object}
     */
    mapDestinationState(destinationRoom, destinationPosition)
    {
        let newState = this.room.loginManager.playerRoomState.getStateObjectFromRoom(destinationRoom);
        if(!sc.isObject(destinationPosition)){
            return newState;
        }
        if(sc.isNumber(destinationPosition.x) && sc.isNumber(destinationPosition.y)){
            newState.x = destinationPosition.x;
            newState.y = destinationPosition.y;
        }
        if(sc.inArray(destinationPosition.dir, this.validDirections)){
            newState.dir = destinationPosition.dir;
        }
        return newState;
    }

    /**
     * @param {Client} client
     * @param {Player} playerSchema
     * @param {Object} newState
     * @returns {Promise<boolean>}
     */
    async relocateInRoom(client, playerSchema, newState)
    {
        let playerBody = playerSchema.physicalBody;
        this.room.clearMovementIntervals(playerSchema.player_id);
        playerBody.resetAuto();
        playerBody.stopFull();
        playerBody.position = [newState.x, newState.y];
        playerBody.aabbNeedsUpdate = true;
        this.room.state.positionPlayer(client.sessionId, newState);
        playerSchema.state.dir = newState.dir;
        return Boolean(await this.room.savePlayerState(client.sessionId));
    }

    /**
     * @param {Client} client
     * @param {Player} playerSchema
     * @param {string} destinationRoomName
     * @param {Object} newState
     * @returns {Promise<boolean>}
     */
    async relocateToRoom(client, playerSchema, destinationRoomName, newState)
    {
        let playerBody = playerSchema.physicalBody;
        playerBody.isChangingScene = true;
        if(!await this.room.isNextRoomAvailable(client, destinationRoomName, playerBody)){
            return false;
        }
        this.room.clearMovementIntervals(playerSchema.player_id);
        playerBody.resetAuto();
        playerBody.stopFull();
        let previousState = this.room.replacePlayerState(
            playerSchema,
            Object.assign({}, newState, {scene: destinationRoomName})
        );
        if(!await this.room.savePlayerState(client.sessionId)){
            Logger.error('Relocation state save error for the player "'+playerSchema.player_id+'".');
            this.room.replacePlayerState(playerSchema, previousState);
            playerBody.isChangingScene = false;
            return false;
        }
        this.room.broadcast('*', {
            act: GameConst.CHANGING_SCENE,
            id: client.sessionId,
            scene: previousState.scene,
            prev: previousState.scene
        });
        this.room.broadcastSceneChange(client, playerSchema, {prev: previousState.scene});
        return true;
    }

}

module.exports.PlayerRelocator = PlayerRelocator;
