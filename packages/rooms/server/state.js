/**
 *
 * Reldens - State
 *
 * This class will handle the server - client communications.
 *
 */

const { Schema, MapSchema, type } = require('@colyseus/schema');
const { Player } = require('../../users/server/player');
const { Logger } = require('../../game/logger');

class State extends Schema
{

    constructor(roomData)
    {
        super();
        // @NOTE: this JSON is to send the scene data to the client, here we could remove data we don't want to send.
        this.sceneData = JSON.stringify(roomData);
        this.players = new MapSchema();
    }

    createPlayer(id, playerData)
    {
        this.players[id] = new Player(playerData, id);
        return this.players[id];
    }

    positionPlayer(id, data)
    {
        if(!{}.hasOwnProperty.call(this.players, id)){
            Logger.error('Player not found! ID: '+id);
        } else {
            this.players[id].state.mov = false;
            this.players[id].state.x = data.x;
            this.players[id].state.y = data.y;
        }
    }

    removePlayer(id)
    {
        delete this.players[id];
    }

}

type('string')(State.prototype, 'sceneData');
type({ map: Player })(State.prototype, 'players');

module.exports.State = State;
