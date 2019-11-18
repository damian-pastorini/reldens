/**
 *
 * Reldens - State
 *
 * This class will handle the server - client communications.
 *
 */

const { Schema, MapSchema, type } = require('@colyseus/schema');
const Player = require('../../users/server/player');

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
        this.players[id] =  new Player(playerData, id);
        return this.players[id];
    }

    movePlayer(id, data)
    {
        if(data.hasOwnProperty('dir')){
            this.players[id].mov = true;
            this.players[id].state.dir = data.dir;
            this.players[id].state.x = data.x;
            this.players[id].state.y = data.y;
        }
    }

    stopPlayer(id, data)
    {
        if(!this.players[id]){
            // @NOTE: since P2world could run the endContact several times.
        } else {
            let result = true;
            if(this.players[id].mov){
                result = false;
            }
            this.players[id].mov = result;
            this.players[id].state.x = data.x;
            this.players[id].state.y = data.y;
        }
    }

    removePlayer(id)
    {
        delete this.players[id];
    }

}

type({ map: Player })(State.prototype, 'players');
type('string')(State.prototype, 'sceneData');

module.exports = State;
