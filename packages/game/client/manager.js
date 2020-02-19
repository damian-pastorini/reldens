/**
 *
 * Reldens - GameManager
 *
 * Like the ServerManager class, this is the main one that will handle everything on the client side.
 *
 */

const { EventsManager } = require('../events-manager');
const { GameClient } = require('./game-client');
const { GameEngine } = require('./game-engine');
const { RoomEvents } = require('./room-events');
const { FeaturesManager } = require('../../features/client/manager');
const { ConfigProcessor } = require('../../config/processor');
const { Logger } = require('../logger');
const { GameConst } = require('../constants');

class GameManager
{

    constructor()
    {
        // active room is the currently connected server room:
        this.activeRoomEvents = false;
        // joined rooms:
        this.joinedRooms = {};
        // user data:
        this.userData = {};
        // player data:
        this.playerData = false;
        // @NOTE: the game engine will be initialized after the user logged in the game that way we will get the full
        // game configuration from the server when the game starts.
        this.gameEngine = false;
        // game over validator:
        this.gameOver = false;
        // client events:
        this.events = EventsManager;
        // full game config:
        this.config = ConfigProcessor;
        // features manager:
        this.features = new FeaturesManager();
        // active scene:
        this.isChangingScene = false;
    }

    setupClasses(customClasses)
    {
        EventsManager.emit('reldens.setupClasses', this, customClasses);
        if({}.hasOwnProperty.call(customClasses, 'objects')){
            this.config.customClasses = customClasses;
        }
    }

    async joinGame(formData, isNewUser = false)
    {
        await EventsManager.emit('reldens.beforeJoinGame', {gameManager: this, formData: formData, isNewUser: isNewUser});
        this.initializeClient();
        // login or register:
        if(isNewUser){
            this.userData.isNewUser = true;
            this.userData.email = formData['email'];
        }
        this.userData.username = formData['username'];
        this.userData.password = formData['password'];
        // join initial game room, since we return the promise we don't need to catch the error here:
        let gameRoom = await this.gameClient.joinOrCreate(GameConst.ROOM_GAME, this.userData);
        await EventsManager.emit('reldens.joinedGameRoom', gameRoom);
        gameRoom.onMessage(async (message) => {
            // only the current client will get this message:
            if(message.act === GameConst.START_GAME){
                await this.initEngineAndStartGame(message);
                // @NOTE we leave the game room after the game initialized because at that point the user already
                // joined the scene room and is pointless to keep this room connected since it doesn't listen for
                // any package.
                gameRoom.leave();
            }
        });
        // @NOTE: we return the gameRoom here to control the login result actions in the index script.
        return gameRoom;
    }

    initializeClient()
    {
        // server url:
        let serverUrl = this.getServerUrl();
        // setup game client:
        this.gameClient = new GameClient(serverUrl);
    }

    async initEngineAndStartGame(initialGameData)
    {
        await EventsManager.emit('reldens.beforeInitEngineAndStartGame', initialGameData);
        if(!{}.hasOwnProperty.call(initialGameData, 'gameConfig')){
            throw new Error('ERROR - Missing game configuration.');
        }
        // save original player data:
        this.playerData = initialGameData.player;
        // apply the initial config to the processor:
        Object.assign(this.config, initialGameData.gameConfig);
        // initialize game engine:
        this.gameEngine = new GameEngine(initialGameData.gameConfig);
        // features list:
        this.features.loadFeatures(initialGameData.features);
        // since the user is now registered:
        this.userData.isNewUser = false;
        // first join the features rooms:
        await this.joinFeaturesRooms();
        // create room events manager:
        let joinedFirstRoom = await this.gameClient.joinOrCreate(initialGameData.player.state.scene, this.userData);
        if(!joinedFirstRoom){
            // @NOTE: the errors while trying to join a rooms/scene will always be originated in the
            // server. For these errors we will alert the user and reload the window automatically.
            alert('ERROR - There was an error while joining the room: '+initialGameData.player.state.scene);
            window.location.reload();
        }
        await EventsManager.emit('reldens.joinedRoom', joinedFirstRoom, this);
        await EventsManager.emit('reldens.joinedRoom_'+initialGameData.player.state.scene, joinedFirstRoom, this);
        // start listening the new room events:
        this.activeRoomEvents = this.createRoomEventsInstance(initialGameData.player.state.scene);
        this.activeRoomEvents.activateRoom(joinedFirstRoom);
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
            if({}.hasOwnProperty.call(feature, 'joinRooms')){
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
                    this.joinedRooms[joinRoomName] = joinedRoom;
                    EventsManager.emit('reldens.joinedRoom', joinedRoom, this);
                    EventsManager.emit('reldens.joinedRoom_'+joinRoomName, joinedRoom, this);
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
        this.isChangingScene = true;
        this.gameClient.joinOrCreate(newRoomEvents.roomName, this.userData).then((sceneRoom) => {
            // leave old room:
            previousRoom.leave();
            this.activeRoomEvents = newRoomEvents;
            this.room = sceneRoom;
            EventsManager.emit('reldens.joinedRoom', sceneRoom, this);
            EventsManager.emit('reldens.joinedRoom_'+message.player.state.scene, sceneRoom, this);
            // start listen to room events:
            newRoomEvents.activateRoom(sceneRoom, message.prev);
        }).catch((err) => {
            // @NOTE: the errors while trying to reconnect will always be originated in the server. For these errors we
            // will alert the user and reload the window automatically.
            alert(err);
            Logger.error(['Reconnect Game Client:', err, 'message:', message, 'previousRoom:', previousRoom]);
            window.location.reload();
        });
    }

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
        if(this.clientUrl){
            return this.clientUrl;
        }
        if({}.hasOwnProperty.call(this.config, 'serverUrl')){
            this.clientUrl = this.config.serverUrl;
        } else {
            let host = window.location.hostname;
            let wsProtocol = 'ws://';
            let wsPort = (window.location.port ? ':'+window.location.port : '');
            this.clientUrl = wsProtocol+host+wsPort;
        }
        return this.clientUrl;
    }

    getActiveScene()
    {
        return this.activeRoomEvents.getActiveScene();
    }

    getActiveScenePreloader()
    {
        let activeSceneKey = this.getActiveScene().key;
        return this.gameEngine.scene.getScene('ScenePreloader'+activeSceneKey);
    }

    getCurrentPlayer()
    {
        return this.getActiveScene().player;
    }

}

module.exports.GameManager = GameManager;
