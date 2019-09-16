const GameClient = require('./game-client');
const GameEngine = require('./game-engine');
const RoomEvents = require('./room-events');
const share = require('../utils/constants');
const gameSeverConfig = require('../../config/server');

class Reldens
{

    constructor()
    {
        // setup game client:
        this.gameClient = new GameClient(this);
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
        // join initial game room, since we return the promise we don't need to catch the error here:
        let gameRoom = this.gameClient.joinOrCreate(share.ROOM_GAME, this.gameClient.userData);
        gameRoom.then((gameRoom) => {
            this.gameRoom = gameRoom;
            gameRoom.onMessage((message) => {
                // only the current client will get this message:
                if(message.act === share.START_GAME){
                    if(message.hasOwnProperty('gameConfig')){
                        // initialize game engine:
                        this.gameEngine = new GameEngine(message.gameConfig);
                    }
                    // @TODO: chat will be loaded as feature.
                    /*
                    // initiate global chat for current user:
                    let globalChatProm = this.gameClient.joinOrCreate(share.CHAT_GLOBAL, this.gameClient.userData)
                        .catch((errorMessage) => {
                            // @NOTE: global chat errors will always be originated in the server. For these errors we
                            // will alert the user and reload the window automatically.
                            // room error, the received "data" will be the actual onAuth error.
                            alert(errorMessage);
                            window.location.reload();
                        });
                    globalChatProm.then((globalChat) => {
                        globalChat.onMessage((message) => {
                            // chat events:
                            let uiScene = this.gameEngine.uiScene;
                            if(uiScene && message.act === share.CHAT_ACTION){
                                let readPanel = uiScene.uiChat.getChildByProperty('id', share.CHAT_MESSAGES);
                                if(readPanel){
                                    readPanel.innerHTML += `${message[share.CHAT_FROM]}: ${message[share.CHAT_MESSAGE]}<br/>`;
                                    readPanel.scrollTo(0, readPanel.scrollHeight);
                                }
                            }
                        });
                        this.gameClient.globalChat = globalChat;
                        */
                    this.gameClient.userData.isNewUser = false;
                    this.activeRoom = new RoomEvents(message.player.scene, this.gameEngine, this.gameClient);
                    this.gameClient.joinOrCreate(this.activeRoom.roomName, this.gameClient.userData).then((room) => {
                        this.gameRoom.leave();
                        this.activeRoom.startListen(room);
                    }).catch((errorMessage) => {
                        // @NOTE: the errors while trying to join a rooms/scene will always be originated in the
                        // server. For these errors we will alert the user and reload the window automatically.
                        alert(errorMessage);
                        window.location.reload();
                    });
                    // });
                }
            });
        });
        return gameRoom;
    }

    initializeFeatures()
    {

    }

    getServerUrl()
    {
        if(!this.clientUrl){
            if(gameSeverConfig.hasOwnProperty('serverUrl')){
                this.clientUrl = gameSeverConfig.serverUrl;
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
