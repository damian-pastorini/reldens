var Player = require('./player').player;

class State
{

    constructor()
    {
        this.players = {};
    }

    createPlayer(sessionId, playerData)
    {
        console.log('state create player:', sessionId, playerData);
        var newPlayer = new Player(playerData);
        newPlayer.sessionId = sessionId;
        this.players[sessionId] = newPlayer;
    }

    removePlayer(id)
    {
        console.log('remove player:', id);
        delete this.players[id];
    }

    movePlayer(id, movement)
    {
        console.log('move player:', id, ' > ', movement);
        if(movement.x){
            this.players[id].x = movement.x;
            // this.players[id].x += movement.x * 10;
        } else if (movement.y) {
            this.players[id].y = movement.y;
            // this.players[id].y += movement.y * 10;
        }
    }

}

exports.state = State;
