const ColyseusClient = require('colyseus.js').Client;
const RoomEvents = require('./room-events');

class GameClient extends ColyseusClient
{

    constructor(reldens)
    {
        super(reldens.getServerUrl());
        this.reldens = reldens;
        this.userData = {};
    }

    // reconnect custom method to change rooms and scenes:
    reconnectGameClient(message, previousRoom)
    {
        let newRoom = new RoomEvents(message.player.state.scene, this.reldens.gameEngine, this);
        this.joinOrCreate(newRoom.roomName, this.userData).then((sceneRoom) => {
            // leave old room:
            previousRoom.leave();
            this.reldens.gameEngine.clientRoom = sceneRoom;
            this.activeRoom = newRoom;
            this.room = sceneRoom;
            // start listen to room events:
            newRoom.startListen(sceneRoom, message.prev);
        }).catch((errorMessage) => {
            // @NOTE: the errors while trying to reconnect will always be originated in the server. For these errors we
            // will alert the user and reload the window automatically.
            alert(errorMessage);
            console.log('ERROR - reconnectGameClient:', errorMessage, 'message:', message, 'previousRoom:', previousRoom);
            window.location.reload();
        });
    };

}

module.exports = GameClient;
