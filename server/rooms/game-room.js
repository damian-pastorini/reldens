var Room = require('colyseus').Room;
var State = require('../modules/state').state;

class GameRoom extends Room
{

    onInit (options) {
        console.log("GameRoom created!", options);
        this.setState(new State());
    }

    onJoin (client) {
        this.state.createPlayer(client.sessionId);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onMessage (client, data) {
        console.log("GameRoom received message from", client.sessionId, ":", data);
        this.state.movePlayer(client.sessionId, data);
    }

    onDispose () {
        console.log("Dispose GameRoom");
    }

}

exports.gameroom = GameRoom;
