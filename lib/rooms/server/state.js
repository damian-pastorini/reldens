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
        // @NOTE: this JSON is to send the scene data to the client, here we could remove data we don't want to send.
        this.sceneData = JSON.stringify(roomData);
        this.players = new MapSchema();
        this.bodies = new MapSchema();
    }

    createPlayerSchema(playerData, id)
    {
        return new Player(playerData, id);
    }

    addPlayerToState(playerSchema, id)
    {
        this.players[id] = playerSchema;
        return this.players[id];
    }

    positionPlayer(id, data)
    {
        if(!sc.hasOwn(this.players, id)){
            Logger.error('Player not found! ID: '+id);
            return false;
        }
        this.players[id].state.mov = false;
        this.players[id].state.x = data.x;
        this.players[id].state.y = data.y;
    }

    removePlayer(id)
    {
        delete this.players[id];
    }

}

type('string')(State.prototype, 'sceneData');
type({map: Player})(State.prototype, 'players');
type({map: ObjectBodyState})(State.prototype, 'bodies');

module.exports.State = State;
