const Colyseus = require('colyseus.js');
const Phaser = require('phaser');
const RoomEvents = require('./room-events');
const gameConfig = require('../../shared/game-config');
const share = require('../../shared/constants');

class GameClient
{

    constructor()
    {
        // host data:
        this.host = window.location.hostname;
        let wsProtocol = 'ws://';
        let wsPort = (window.location.port ? ':'+window.location.port : '');
        // setup Colyseus:
        this.colyseusClient = new Colyseus.Client(wsProtocol+this.host+wsPort);
        this.colyseusClient.userData = {};
        // init properties:
        this.gameRoom = false;
        this.activeRoom = false;
        // reconnect custom method to change rooms and scenes:
        this.colyseusClient.reconnectColyseus = (message, previousRoom) => {
            let newRoom = new RoomEvents(message.player.scene, this.phaserGame, this.colyseusClient);
            this.colyseusClient.joinOrCreate(newRoom.roomName, this.colyseusClient.userData).then((sceneRoom) => {
                // leave old room:
                previousRoom.leave();
                this.phaserGame.colyseusRoom = sceneRoom;
                this.activeRoom = newRoom;
                this.room = sceneRoom;
                // start listen to room events:
                newRoom.startListen(sceneRoom, message.prev);
            }).catch((data) => {
                // room error:
                alert('There was a room connection error.');
                console.log('ERROR - ', data);
                window.location.reload();
            });
        };
        // initialize game engine:
        this.phaserGame = new Phaser.Game(gameConfig);
        // @TODO: extend Phaser.Game in a custom object to add custom features.
        this.phaserGame.uiScene = false;
        this.phaserGame.statsDisplayed = false;
    }

    joinGameRoom(formData, isNewUser = false)
    {
        // login or register:
        if(isNewUser){
            this.colyseusClient.userData.isNewUser = true;
            this.colyseusClient.userData.email = formData['email'];
        }
        this.colyseusClient.userData.username = formData['username'];
        this.colyseusClient.userData.password = formData['password'];
        // join room:
        return this.colyseusClient.joinOrCreate(share.ROOM_GAME, this.colyseusClient.userData).then((gameRoom) => {
            this.gameRoom = gameRoom;
            gameRoom.onMessage((message) => {
                if(message.act === share.START_GAME && message.sessionId === this.gameRoom.sessionId){
                    // initiate global chat for current user:
                    let globalChatProm = this.colyseusClient.joinOrCreate(share.CHAT_GLOBAL, this.colyseusClient.userData);
                    globalChatProm.then((globalChat) => {
                        globalChat.onMessage((message) => {
                            // chat events:
                            let uiScene = this.phaserGame.uiScene;
                            if(uiScene && message.act === share.CHAT_ACTION){
                                let readPanel = uiScene.uiChat.getChildByProperty('id', share.CHAT_MESSAGES);
                                if(readPanel){
                                    readPanel.innerHTML += `${message[share.CHAT_FROM]}: ${message[share.CHAT_MESSAGE]}<br/>`;
                                    readPanel.scrollTo(0, readPanel.scrollHeight);
                                }
                            }
                        });
                        this.colyseusClient.globalChat = globalChat;
                        this.colyseusClient.userData.isNewUser = false;
                        this.activeRoom = new RoomEvents(message.player.scene, this.phaserGame, this.colyseusClient);
                        this.colyseusClient.joinOrCreate(this.activeRoom.roomName, this.colyseusClient.userData).then((room) => {
                            this.gameRoom.leave();
                            this.activeRoom.startListen(room);
                        }).catch((data) => {
                            // room error:
                            alert('There was a room connection error.');
                            console.log('ERROR - ', data);
                            window.location.reload();
                        });
                    });
                }
            });
        }).catch((data) => {
            alert('Connection error.');
            console.log('ERROR - Connection error:', data);
            window.location.reload();
        });
    }

}

module.exports = GameClient;
