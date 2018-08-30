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

    removePlayer(id)
    {
        delete this.players[id];
    }

    movePlayer(id, movement)
    {
        if(movement.x){
            this.players[id].x += movement.x * 10;
        } else if (movement.y) {
            this.players[id].y += movement.y * 10;
        }
    }

}

exports.state = State;
