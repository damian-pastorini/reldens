const Player = require('./player').player;
const share = require('../../shared/constants');

class State
{

    constructor(sceneData)
    {
        this.sceneData = sceneData;
        this.players = {};
    }

    createPlayer(sessionId, playerData)
    {
        let newPlayer = new Player(playerData);
        newPlayer.sessionId = sessionId;
        this.players[sessionId] = newPlayer;
        return this.players[sessionId];
    }

    movePlayer(id, data)
    {
        if(data.hasOwnProperty('dir')){
            this.players[id].dir = data.dir;
            if(data.dir === share.RIGHT || data.dir === share.LEFT){
                this.players[id].x = data.x;
            }
            if(data.dir === share.UP || data.dir === share.DOWN){
                this.players[id].y = data.y;
            }
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

exports.state = State;
