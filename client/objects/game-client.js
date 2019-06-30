const Colyseus = require('colyseus.js');
const Phaser = require('phaser');
const SceneInit = require('./scene-init');
const RoomEvents = require('./room-events');
const share = require('../../shared/constants');
const gameConfig = require('../../shared/game-config');

class GameClient
{

    constructor()
    {
        this.host = window.document.location.host.replace(/:.*/, '');
        let wsProtocol = location.protocol.replace('http', 'ws');
        this.colyseusClient = new Colyseus.Client(wsProtocol+this.host+(location.port ? ':'+location.port : ''));
        this.colyseusClient.userData = {};
        this.gameRoom = false;
        this.activeRoom = false;
        // on game-room join init Phaser client:
        let config = gameConfig;
        config.scene = [SceneInit];
        // initialize game:
        this.phaserGame = new Phaser.Game(config);
    }

    joinRoom(formData, isNewUser = false)
    {
        // login or register:
        if(isNewUser){
            this.colyseusClient.userData.isNewUser = true;
            this.colyseusClient.userData.email = formData['email'];
        }
        this.colyseusClient.userData.username = formData['username'];
        this.colyseusClient.userData.password = formData['password'];
        // save username and password in client for later use:
        this.colyseusClient.reconnectColyseus = (message, previousRoom) => {
            let newRoom = new RoomEvents(message.player.scene, this.phaserGame, this.colyseusClient);
            // let newColyseusRoom = newRoom.join();
            let newColyseusRoom = this.colyseusClient.join(newRoom.roomName, this.colyseusClient.userData);
            // as soon we join the room we set it in the Phaser client:
            this.phaserGame.colyseusRoom = newColyseusRoom;
            newColyseusRoom.onJoin.add(() => {
                // leave old room:
                previousRoom.leave();
                // start listen to room events:
                newRoom.startListen(newColyseusRoom, message.prev);
            });
        };
        // join room:
        this.gameRoom = this.colyseusClient.join(share.ROOM_GAME, this.colyseusClient.userData);
        // on join activate game:
        this.gameRoom.onJoin.add(() => {
            this.gameRoom.onError.add((data) => {
                alert('Connection error.');
                window.location.reload();
            });
            this.colyseusClient.userData.isNewUser = false;
        });
        this.gameRoom.onMessage.add((message) => {
            if(message.act === share.START_GAME && message.sessionId === this.gameRoom.sessionId){
                this.activeRoom = new RoomEvents(message.player.scene, this.phaserGame, this.colyseusClient);
                // let colyseusRoom = this.activeRoom.join();
                let colyseusRoom = this.colyseusClient.join(this.activeRoom.roomName, this.colyseusClient.userData);
                colyseusRoom.onJoin.add(() => {
                    this.gameRoom.leave();
                    this.activeRoom.startListen(colyseusRoom);
                });
            }
        });
        return this.gameRoom;
    }

}

module.exports = GameClient;
