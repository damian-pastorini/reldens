const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const type = schema.type;
const Player = require('./player');
const MapSchema = schema.MapSchema;
// const share = require('../../shared/constants');

class State extends Schema
{

    constructor(sceneData)
    {
        super();
        // @TODO: refactor to use an object for the scene data and avoid the JSON parsing.
        this.sceneData = JSON.stringify(sceneData);
        this.players = new MapSchema();
    }

    createPlayer(id, playerData)
    {
        let newPlayer = new Player(playerData);
        newPlayer.sessionId = id;
        this.players[id] = newPlayer;
        return this.players[id];
    }

    movePlayer(id, data)
    {
        if(data.hasOwnProperty('dir')){
            this.players[id].mov = true;
            this.players[id].dir = data.dir;
            // @TODO: validate body movement be optional and part of the configuration in the database.
            // if(data.dir === share.RIGHT || data.dir === share.LEFT){
            this.players[id].x = data.x;
            // }
            // if(data.dir === share.UP || data.dir === share.DOWN){
            this.players[id].y = data.y;
            // }
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
            this.players[id].x = data.x;
            this.players[id].y = data.y;
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
