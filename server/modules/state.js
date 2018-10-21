const Player = require('./player').player;

class State
{

    constructor(sceneData)
    {
        // @TODO: move scene data logic to the server side to validate the client actions.
        this.sceneData = sceneData;
        this.players = {};
    }

    createPlayer(sessionId, playerData)
    {
        let newPlayer = new Player(playerData);
        newPlayer.sessionId = sessionId;
        this.players[sessionId] = newPlayer;
    }

    movePlayer(id, data)
    {
        // @TODO: move values and logic to the server side to validate the client actions.
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
        // @TODO: move values and logic to the server side to validate the client actions.
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
