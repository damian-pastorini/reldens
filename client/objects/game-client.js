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
        this.host = window.document.location.host.replace(/:.*/, '');
        let wsProtocol = location.protocol.replace('http', 'ws');
        // setup Colyseus:
        this.colyseusClient = new Colyseus.Client(wsProtocol+this.host+(location.port ? ':'+location.port : ''));
        this.colyseusClient.onError.add((e) => {
            alert('There was a connection error.');
            console.log('ERROR - ', e);
            window.location.reload();
        });
        this.colyseusClient.onClose.add(() => {
            alert('The connections with the server was closed.');
            window.location.reload();
        });
        this.colyseusClient.userData = {};
        // reconnect custom method to change rooms and scenes:
        this.colyseusClient.reconnectColyseus = (message, previousRoom) => {
            let newRoom = new RoomEvents(message.player.scene, this.phaserGame, this.colyseusClient);
            let newColyseusRoom = this.colyseusClient.join(newRoom.roomName, this.colyseusClient.userData);
            this.activeRoom = newRoom;
            this.room = newColyseusRoom;
            // as soon we join the room we set it in the Phaser client:
            this.phaserGame.colyseusRoom = newColyseusRoom;
            newColyseusRoom.onJoin.add(() => {
                // leave old room:
                previousRoom.leave();
                this.activeRoom = newRoom;
                this.room = newColyseusRoom;
                // start listen to room events:
                newRoom.startListen(newColyseusRoom, message.prev);
            });
        };
        this.gameRoom = false;
        this.activeRoom = false;
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
        this.gameRoom = this.colyseusClient.join(share.ROOM_GAME, this.colyseusClient.userData);
        // on join activate game:
        this.gameRoom.onJoin.add(() => {
            // initiate global chat for current user:
            this.startChatGlobal();
            this.gameRoom.onError.add((data) => {
                alert('Connection error.');
                console.log('ERROR - Connection error:', data);
                window.location.reload();
            });
            this.colyseusClient.userData.isNewUser = false;
        });
        this.gameRoom.onMessage.add((message) => {
            if(message.act === share.START_GAME && message.sessionId === this.gameRoom.sessionId){
                this.activeRoom = new RoomEvents(message.player.scene, this.phaserGame, this.colyseusClient);
                let colyseusRoom = this.colyseusClient.join(this.activeRoom.roomName, this.colyseusClient.userData);
                colyseusRoom.onJoin.add(() => {
                    this.gameRoom.leave();
                    this.activeRoom.startListen(colyseusRoom);
                });
            }
        });
        return this.gameRoom;
    }

    startChatGlobal()
    {
        this.chatRoom = this.colyseusClient.join(share.CHAT_GLOBAL, this.colyseusClient.userData);
        this.chatRoom.onJoin.add(() => {
            this.chatRoom.onMessage.add((message) => {
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
        });
    }

}

module.exports = GameClient;
