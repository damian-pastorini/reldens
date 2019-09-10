const ColyseusClient = require('colyseus.js').Client;
const RoomEvents = require('./room-events');

class GameClient extends ColyseusClient
{

    constructor(serverUrl)
    {
        super(serverUrl);
        this.userData = {};
    }

    // reconnect custom method to change rooms and scenes:
    reconnectColyseus(message, previousRoom)
    {
        let newRoom = new RoomEvents(message.player.scene, this.phaserGame, this);
        this.joinOrCreate(newRoom.roomName, this.userData).then((sceneRoom) => {
            // leave old room:
            previousRoom.leave();
            this.phaserGame.colyseusRoom = sceneRoom;
            this.activeRoom = newRoom;
            this.room = sceneRoom;
            // start listen to room events:
            newRoom.startListen(sceneRoom, message.prev);
        }).catch((errorMessage) => {
            // room error, the received "data" will be the actual onAuth error.
            alert(errorMessage);
            window.location.reload();
        });
    };

}

module.exports = GameClient;
