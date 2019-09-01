const GameClient = require('./game-client');
const GameEngine = require('./game-engine');
const RoomEvents = require('./room-events');
const share = require('../utils/constants');

class Reldens
{

    constructor()
    {
        // setup game client, colyseus extended class:
        this.gameClient = new GameClient(this.getServerUrl());
        // the game engine will be initialized after the user joined the game:
        this.gameEngine = false;
        // game room will be used for login:
        this.gameRoom = false;
        // global room will be use for massive actions:
        this.globlaRoom = false;
        // active room will be where the user is currently:
        this.activeRoom = false;
        // features will be loaded in "featuresList" and initialized in "features" after the user logged in:
        this.featuresList = [];
        this.features = {};
    }

    joinGameRoom(formData, isNewUser = false)
    {
        // login or register:
        if(isNewUser){
            this.gameClient.userData.isNewUser = true;
            this.gameClient.userData.email = formData['email'];
        }
        this.gameClient.userData.username = formData['username'];
        this.gameClient.userData.password = formData['password'];
        // join room:
        return this.gameClient.joinOrCreate(share.ROOM_GAME, this.gameClient.userData).then((gameRoom) => {
            if(gameRoom.hasOwnProperty('gameConfig')){
                // initialize game engine:
                this.gameEngine = new GameEngine(gameRoom.gameConfig);
            }
            this.gameRoom = gameRoom;
            gameRoom.onMessage((message) => {
                if(message.act === share.START_GAME && message.sessionId === this.gameRoom.sessionId){
                    // initiate global chat for current user:
                    let globalChatProm = this.gameClient.joinOrCreate(share.CHAT_GLOBAL, this.gameClient.userData);
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
                        this.gameClient.globalChat = globalChat;
                        this.gameClient.userData.isNewUser = false;
                        this.activeRoom = new RoomEvents(message.player.scene, this.phaserGame, this.gameClient);
                        this.gameClient.joinOrCreate(this.activeRoom.roomName, this.gameClient.userData).then((room) => {
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

    initializeFeatures()
    {

    }

    getServerUrl()
    {
        if(!this.clientUrl){
            if(gameConfig.hasOwnProperty('serverUrl')){
                this.clientUrl = gameConfig.serverUrl;
            } else {
                let host = window.location.hostname;
                let wsProtocol = 'ws://';
                let wsPort = (window.location.port ? ':'+window.location.port : '');
                this.clientUrl = wsProtocol+host+wsPort;
            }
        }
        return this.clientUrl;
    }

}

module.exports = Reldens;
