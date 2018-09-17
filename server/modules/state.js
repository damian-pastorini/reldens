var Player = require('./player').player;

class State
{

    constructor()
    {
        this.players = {};
    }

    createPlayer(sessionId, playerData)
    {
        var newPlayer = new Player(playerData);
        newPlayer.sessionId = sessionId;
        this.players[sessionId] = newPlayer;
    }

    movePlayer(id, data)
    {
        // @TODO: move movement logic to the server side.
        if(data.x != this.players[id].x){
            this.players[id].x = data.x;
            this.players[id].mov = true;
            this.players[id].dir = data.dir;
        }
        if(data.y != this.players[id].y){
            this.players[id].y = data.y;
            this.players[id].mov = true;
            this.players[id].dir = data.dir;
        }
    }

    stopPlayer(id, data)
    {
        let result = true;
        if(this.players[id].mov){
            result = false;
        }
        this.players[id].mov = result;
    }

    removePlayer(id)
    {
        delete this.players[id];
    }

}

exports.state = State;
