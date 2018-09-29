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
        /* NOTE: in case we need to add the player as first attribute we can use the following example.
        let tmpObj = {};
        tmpObj[sessionId] = newPlayer;
        let newPlayers = Object.assign(tmpObj, this.players);
        // console.log(newPlayers);
        this.players = newPlayers;
        */
    }

    movePlayer(id, data)
    {
        // @TODO: the values and logic should be on the server side to re-validate the client actions.
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
        // @TODO: the values and logic should be on the server side to re-validate the client actions.
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
