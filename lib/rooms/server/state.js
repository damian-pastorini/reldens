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
const { Logger, sc } = require('@reldens/utils');

class State extends Schema
{

    constructor(roomData)
    {
        super();
        this.mapRoomData(roomData);
        this.players = new MapSchema();
        this.bodies = new MapSchema();
    }

    mapRoomData(roomData)
    {
        // @NOTE: this JSON is to send the scene data to the client, here we could remove data we don't want to send.
        this.sceneData = JSON.stringify(roomData);
        if(sc.hasOwn(roomData, 'worldConfig')){
            Object.assign(this.sceneData, roomData.worldConfig);
        }
    }

    createPlayerSchema(playerData, sessionId)
    {
        return new Player(playerData, sessionId);
    }

    addPlayerToState(playerSchema, id)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        this.players.set(id, playerSchema);
        return this.players.get(id);
    }

    positionPlayer(id, data)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
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
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        this.players.delete(id);
    }

    fetchBody(id)
    {
        return this.bodies.get(id);
    }

    addBodyToState(body, bodyId)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
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
