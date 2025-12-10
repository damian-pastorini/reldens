/**
 *
 * Reldens - State
 *
 * Colyseus Schema for synchronizing room state between server and clients.
 *
 */

const { Schema, MapSchema, type } = require('@colyseus/schema');
const { Player } = require('../../users/server/player');
const { ObjectBodyState } = require('../../world/server/object-body-state');
const { Logger } = require('@reldens/utils');

class State extends Schema
{

    /**
     * @param {Object} [roomData]
     */
    constructor(roomData)
    {
        super();
        /** @type {Object} */
        this.roomData = roomData || {};
        this.mapRoomData();
        /** @type {MapSchema<Player>} */
        this.players = new MapSchema();
        /** @type {MapSchema<ObjectBodyState>} */
        this.bodies = new MapSchema();
    }

    /**
     * @param {Object} [roomData]
     */
    mapRoomData(roomData)
    {
        if(!roomData){
            roomData = this.roomData;
        }
        // @NOTE: this JSON is sent to the client as the initial data, here we could remove data we don't want to send.
        // This will get updated in cases like respawn objects restore (where the objects initial position change), or
        // when drops are created.
        this.sceneData = JSON.stringify(roomData);
    }

    /**
     * @param {Object} playerData
     * @param {string} sessionId
     * @returns {Player}
     */
    createPlayerSchema(playerData, sessionId)
    {
        return new Player(playerData, sessionId);
    }

    /**
     * @param {Player} playerSchema
     * @param {string} id
     * @returns {Player}
     */
    addPlayerToState(playerSchema, id)
    {
        this.players.set(id, playerSchema);
        return this.players.get(id);
    }

    /**
     * @param {string} id
     * @param {Object} data
     * @returns {boolean|void}
     */
    positionPlayer(id, data)
    {
        let player = this.players.get(id);
        if(!player){
            Logger.error('Player not found! ID: '+id);
            return false;
        }
        player.state.mov = false;
        player.state.x = data.x;
        player.state.y = data.y;
    }

    /**
     * @param {string} id
     */
    removePlayer(id)
    {
        this.players.delete(id);
    }

    /**
     * @param {string} id
     * @returns {ObjectBodyState|undefined}
     */
    fetchBody(id)
    {
        return this.bodies.get(id);
    }

    /**
     * @param {ObjectBodyState} body
     * @param {string} bodyId
     * @returns {ObjectBodyState}
     */
    addBodyToState(body, bodyId)
    {
        this.bodies.set(bodyId, body);
        return this.bodies.get(bodyId);
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    removeBody(id)
    {
        if(!this.fetchBody(id)){
            return false;
        }
        return this.bodies.delete(id);
    }

}

type('string')(State.prototype, 'sceneData');
type({map: Player})(State.prototype, 'players');
type({map: ObjectBodyState})(State.prototype, 'bodies');

module.exports.State = State;
