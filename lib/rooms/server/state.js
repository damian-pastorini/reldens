/**
 *
 * Reldens - State
 *
 * This class will handle the server - client communications.
 *
 */

const { Schema, MapSchema, type } = require('@colyseus/schema');
const { Player } = require('../../users/server/player');
const { ObjectBodyState } = require('../../world/server/object-body-state');
const { Logger } = require('@reldens/utils');

class State extends Schema
{

    constructor(roomData)
    {
        super();
        this.roomData = roomData || {};
        this.mapRoomData();
        this.players = new MapSchema();
        this.bodies = new MapSchema();
    }

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

    createPlayerSchema(playerData, sessionId)
    {
        return new Player(playerData, sessionId);
    }

    addPlayerToState(playerSchema, id)
    {
        this.players.set(id, playerSchema);
        return this.players.get(id);
    }

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

    removePlayer(id)
    {
        this.players.delete(id);
    }

    fetchBody(id)
    {
        return this.bodies.get(id);
    }

    addBodyToState(body, bodyId)
    {
        this.bodies.set(bodyId, body);
        return this.bodies.get(bodyId);
    }

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
