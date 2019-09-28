/**
 *
 * Reldens - GameManager
 *
 * Like the ServerManager class, this is the main one that will handle everything on the client side.
 *
 */

const GameClient = require('./game-client');
const GameEngine = require('./game-engine');
const RoomEvents = require('./room-events');
const FeaturesClient = require('../features/client');
const share = require('../utils/constants');
const gameSeverConfig = require('../../config/server');

class GameManager
{

    constructor()
    {
        // server url:
        let serverUrl = this.getServerUrl();
        // setup game client:
        this.gameClient = new GameClient(serverUrl);
        // @NOTE: the game engine will be initialized after the user logged in the game that way we will get the full
        // game configuration from the server when the game starts.
        this.gameEngine = false;
        // active room is the currently connected server room:
        this.activeRoomEvents = false;
        // joined rooms:
        this.joinedRooms = {};
        // features manager:
        this.features = new FeaturesClient();
        // user data:
        this.userData = {};
    }

    async joinGameRoom(formData, isNewUser = false)
    {
        // login or register:
        if(isNewUser){
            this.userData.isNewUser = true;
            this.userData.email = formData['email'];
        }
        this.userData.username = formData['username'];
        this.userData.password = formData['password'];
        // join initial game room, since we return the promise we don't need to catch the error here:
        let gameRoom = await this.gameClient.joinOrCreate(share.ROOM_GAME, this.userData);
        gameRoom.onMessage((message) => {
            // only the current client will get this message:
            if(message.act === share.START_GAME){
                // initialize the engine and start the game:
                this.initEngineAndStartGame(message).then((joinedFirstRoom) => {
                    // @NOTE we leave the game room after the game initialized because at that point the user already
                    // joined the scene room and is pointless to keep this room connected since it doesn't listen for
                    // any package.
                    gameRoom.leave();
                });
            }
        });
        // @NOTE: we return the gameRoom here to control the login result actions in the index script.
        return gameRoom;
    }

    async initEngineAndStartGame(initialGameData)
    {
        if(!initialGameData.hasOwnProperty('gameConfig')){
            throw new Error('ERROR - Missing game configuration.');
        }
        // initialize game engine:
        this.gameEngine = new GameEngine(initialGameData.gameConfig);
        // features list:
        let featuresList = this.features.loadFeatures(initialGameData.features);
        // since the user is now registered:
        this.userData.isNewUser = false;
        // first join the features rooms:
        let joinExtraRooms = await this.joinFeaturesRooms();
        // create room events manager:
        let joinedFirstRoom = await this.gameClient.joinOrCreate(initialGameData.player.state.scene, this.userData);
        if(!joinedFirstRoom){
            // @NOTE: the errors while trying to join a rooms/scene will always be originated in the
            // server. For these errors we will alert the user and reload the window automatically.
            alert('ERROR - There was an error while joining the room: '+initialGameData.player.state.scene);
            window.location.reload();
        }
        // start listening the new room events:
        this.activeRoomEvents = this.createRoomEventsInstance(initialGameData.player.state.scene);
        this.activeRoomEvents.startListen(joinedFirstRoom);
        return joinedFirstRoom;
    }

    /**
     * Join features rooms dynamically and assign any events listeners if available.
     *
     * @returns {Promise<void>}
     */
    async joinFeaturesRooms()
    {
        for(let idx in this.features.featuresList){
            let feature = this.features.featuresList[idx];
            if(feature.hasOwnProperty('joinRooms')){
                for(let joinRoomName of feature.joinRooms){
                    let joinedRoom = await this.gameClient.joinOrCreate(joinRoomName, this.userData);
                    if(!joinedRoom){
                        // @NOTE: any join room error will always be originated in the server. For these errors we
                        // will alert the user and reload the window automatically. Here the received "data" will
                        // be the actual error message.
                        alert('ERROR - There was an error while joining the room '+joinRoomName);
                        window.location.reload();
                    }
                    // after the room was joined added to the joinedRooms list:
                    // @TODO: remove this global chat after refactor the room-events.
                    this.gameClient.globalChat = joinedRoom;
                    this.joinedRooms[joinRoomName] = joinedRoom;
                    // if the feature as additional message actions then we will observe the messages:
                    if(
                        feature.hasOwnProperty('joinedRoomsOnMessage')
                        && feature.joinedRoomsOnMessage.hasOwnProperty(joinRoomName)
                    ){
                        joinedRoom.onMessage((message) => {
                            feature.messageObserver = new feature.joinedRoomsOnMessage[joinRoomName]();
                            feature.messageObserver.observeMessage(message, this);
                        });
                    }
                }
            }
        }
    }

    /**
     * Reconnect custom method to change rooms and scenes.
     *
     * @param message
     * @param previousRoom
     */
    reconnectGameClient(message, previousRoom)
    {
        let newRoomEvents = this.createRoomEventsInstance(message.player.state.scene);
        this.gameClient.joinOrCreate(newRoomEvents.roomName, this.userData).then((sceneRoom) => {
            // leave old room:
            previousRoom.leave();
            this.activeRoomEvents = newRoomEvents;
            this.room = sceneRoom;
            // start listen to room events:
            newRoomEvents.startListen(sceneRoom, message.prev);
        }).catch((err) => {
            // @NOTE: the errors while trying to reconnect will always be originated in the server. For these errors we
            // will alert the user and reload the window automatically.
            alert(err);
            console.log('ERROR - reconnectGameClient:', err, 'message:', message, 'previousRoom:', previousRoom);
            window.location.reload();
        });
    };

    /**
     * Create RoomEvents instance.
     *
     * @param roomName
     * @returns {RoomEvents}
     */
    createRoomEventsInstance(roomName)
    {
        return new RoomEvents(roomName, this);
    }

    /**
     * Generate server URL from configuration or using the current url data.
     *
     * @returns {*}
     */
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

module.exports = GameManager;
