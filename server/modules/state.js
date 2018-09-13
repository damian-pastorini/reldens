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
        // console.log('player.x: ',this.players[id].x, 'player.y: ', this.players[id].y);
        if(movement.x != this.players[id].x){
            console.log('move x');
            // this.players[id].x = movement.x;
            this.players[id].x = movement.x;// += movement.x * 10;
            this.players[id].mov = true;
        }
        if(movement.y != this.players[id].y){
            // this.players[id].y = movement.y;
            console.log('move y');
            this.players[id].y = movement.y; // += movement.y * 10;
            this.players[id].mov = true;
        }
        if(movement.act = 'stop') {
            console.log('STOP!');
            this.players[id].mov = false;
        }
        if(movement.dir != this.players[id].dir) {
            console.log('direction?');
            this.players[id].dir = movement.dir;
        }
    }

}

exports.state = State;
