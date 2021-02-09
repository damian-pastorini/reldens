/**
 *
 * Reldens - GameManager
 *
 * Like the ServerManager class, this is the main one that will handle everything on the client side.
 *
 */

const { GameClient } = require('./game-client');
const { GameEngine } = require('./game-engine');
const { RoomEvents } = require('./room-events');
const { FeaturesManager } = require('../../features/client/manager');
const { GameDom } = require('./game-dom');
const { ConfigProcessor } = require('../../config/processor');
const { GameConst } = require('../constants');
const { FirebaseConnector } = require('../../firebase/client/connector');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

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
        this.events = EventsManagerSingleton;
        // full game config:
        this.config = ConfigProcessor;
        // features manager:
        this.features = new FeaturesManager();
        // active scene:
        this.isChangingScene = false;
        // dom manager:
        this.gameDom = new GameDom();
        // firebase:
        this.firebase = new FirebaseConnector(this);
        // init engine validator:
        this.canInitEngine = true;
    }

    setupClasses(customClasses)
    {
        this.events.emit('reldens.setupClasses', this, customClasses);
        this.config.customClasses = customClasses;
    }

    async joinGame(formData, isNewUser = false)
    {
        // reset the user data in the object in case another form was used before:
        this.userData = {};
        await this.events.emit('reldens.beforeJoinGame', {gameManager: this, formData, isNewUser});
        if(sc.hasOwn(formData, 'forgot')){
            this.userData.forgot = 1;
            this.userData.email = formData['email'];
        }
        this.initializeClient();
        // login or register:
        if(isNewUser){
            this.userData.isNewUser = true;
            this.userData.email = formData['email'];
        }
        this.userData.username = formData['username'];
        this.userData.password = formData['password'];
        // join initial game room, since we return the promise we don't need to catch the error here:
        this.gameRoom = await this.gameClient.joinOrCreate(GameConst.ROOM_GAME, this.userData);
        await this.events.emit('reldens.beforeJoinGameRoom', this.gameRoom);
        this.gameRoom.onMessage(async (message) => {
            // only the current client will get this message:
            if(message.act === GameConst.START_GAME){
                this.initialGameData = message;
                await this.beforeStartGame();
                // @NOTE we leave the game room after the game initialized because at that point the user already
                // joined the scene room and is pointless to keep this room connected since it doesn't listen for
                // any package.
                // this.gameRoom.leave();
            }
            if(message.act === GameConst.CREATE_PLAYER_RESULT){
                if(message.error){
                    let errorElement = this.gameDom.getElement('.player_create_form .response-error');
                    errorElement.html(message.message);
                    errorElement.removeClass('hidden');
                    return false;
                }
                this.initialGameData.player = message.player;
                let playerSelection = this.gameDom.getElement('#player-selection');
                playerSelection.addClass('hidden');
                await this.initEngine();
            }
        });
        // responsive full screen:
        this.events.on('reldens.afterSceneDynamicCreate', () => {
            if(this.config.get('client/ui/screen/responsive')){
                this.gameEngine.updateGameSize(this);
                this.gameDom.getWindowElement().resize(() => {
                    this.gameEngine.updateGameSize(this);
                });
            }
        });
        // @NOTE: we return the gameRoom here to control the login result actions in the index script.
        return this.gameRoom;
    }

    initializeClient()
    {
        // server url:
        let serverUrl = this.getServerUrl();
        // setup game client:
        this.gameClient = new GameClient(serverUrl);
    }

    async beforeStartGame()
    {
        await this.events.emit('reldens.beforeInitEngineAndStartGame', this.initialGameData, this);
        if(!sc.hasOwn(this.initialGameData, 'gameConfig')){
            throw new Error('ERROR - Missing game configuration.');
        }
        // apply the initial config to the processor:
        Object.assign(this.config, this.initialGameData.gameConfig);
        // features list:
        await this.features.loadFeatures(this.initialGameData.features);
        await this.events.emit('reldens.beforeCreateEngine', this.initialGameData, this);
        if(!this.canInitEngine){
            return false;
        }
        return await this.initEngine();
    }

    async initEngine()
    {
        // we don't need the user on the game room anymore:
        this.gameRoom.leave();
        // save the selected player data:
        this.playerData = this.initialGameData.player;
        this.userData.selectedPlayer = this.initialGameData.player.id;
        // initialize game engine:
        this.gameEngine = new GameEngine(this.initialGameData.gameConfig);
        // since the user is now registered:
        this.userData.isNewUser = false;
        // first join the features rooms:
        await this.joinFeaturesRooms();
        // create room events manager:
        let joinedFirstRoom = await this.gameClient.joinOrCreate(
            this.initialGameData.player.state.scene,
            this.userData
        );
        if(!joinedFirstRoom){
            // @NOTE: the errors while trying to join a rooms/scene will always be originated in the
            // server. For these errors we will alert the user and reload the window automatically.
            alert('ERROR - There was an error while joining the room: ' + this.initialGameData.player.state.scene);
            this.gameDom.getWindow().location.reload();
        }
        await this.events.emit('reldens.joinedRoom', joinedFirstRoom, this);
        await this.events.emit('reldens.joinedRoom_' + this.initialGameData.player.state.scene, joinedFirstRoom, this);
        // start listening the new room events:
        this.activeRoomEvents = this.createRoomEventsInstance(this.initialGameData.player.state.scene);
        await this.activeRoomEvents.activateRoom(joinedFirstRoom);
        await this.events.emit('reldens.afterInitEngineAndStartGame', this.initialGameData, joinedFirstRoom);
        return joinedFirstRoom;
    }

    /**
     * Join features rooms dynamically and assign any events listeners if available.
     *
     * @returns {Promise<void>}
     */
    async joinFeaturesRooms()
    {
        for(let i of Object.keys(this.features.featuresList)){
            let feature = this.features.featuresList[i];
            if(sc.hasOwn(feature, 'joinRooms')){
                for(let joinRoomName of feature.joinRooms){
                    let joinedRoom = await this.gameClient.joinOrCreate(joinRoomName, this.userData);
                    if(!joinedRoom){
                        // @NOTE: any join room error will always be originated in the server. For these errors we
                        // will alert the user and reload the window automatically. Here the received "data" will
                        // be the actual error message.
                        alert('ERROR - There was an error while joining the room '+joinRoomName);
                        this.gameDom.getWindow().location.reload();
                    }
                    // after the room was joined added to the joinedRooms list:
                    this.joinedRooms[joinRoomName] = joinedRoom;
                    await this.events.emit('reldens.joinedRoom', joinedRoom, this);
                    await this.events.emit('reldens.joinedRoom_'+joinRoomName, joinedRoom, this);
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
        this.gameClient.joinOrCreate(newRoomEvents.roomName, this.userData).then(async (sceneRoom) => {
            // leave old room:
            previousRoom.leave();
            this.activeRoomEvents = newRoomEvents;
            this.room = sceneRoom;
            await this.events.emit('reldens.joinedRoom', sceneRoom, this);
            await this.events.emit('reldens.joinedRoom_'+message.player.state.scene, sceneRoom, this);
            // start listen to room events:
            await newRoomEvents.activateRoom(sceneRoom, message.prev);
        }).catch((err) => {
            // @NOTE: the errors while trying to reconnect will always be originated in the server. For these errors we
            // will alert the user and reload the window automatically.
            alert(err);
            Logger.error(['Reconnect Game Client:', err, 'message:', message, 'previousRoom:', previousRoom]);
            this.gameDom.getWindow().location.reload();
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
        if(this.serverUrl){
            // you can specify the client URL before initialize the client (see
            return this.serverUrl;
        } else {
            // or you can let the address be detected using the current access point:
            let host = this.gameDom.getWindow().location.hostname;
            let wsProtocol = this.gameDom.getWindow().location.protocol.indexOf('https') === 0 ? 'wss://' : 'ws://';
            let wsPort = (this.gameDom.getWindow().location.port ? ':'+this.gameDom.getWindow().location.port : '');
            this.serverUrl = wsProtocol+host+wsPort;
        }
        return this.serverUrl;
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

    getUiElement(uiName, logError = true)
    {
        if(!sc.hasOwn(this.gameEngine, 'uiScene') || !this.gameEngine.uiScene){
            if(logError){
                Logger.error('UI Scene not defined.');
            }
            return false;
        }
        return this.gameEngine.uiScene.getUiElement(uiName, logError);
    }

    getFeature(featureKey)
    {
        let featuresList = this.features.featuresList;
        if(!sc.hasOwn(featuresList, featureKey)){
            Logger.error(['Feature key not defined:', featureKey]);
            return false;
        }
        return featuresList[featureKey];
    }

    getAnimationByKey(key)
    {
        return this.getActiveScene().getAnimationByKey(key);
    }

}

module.exports.GameManager = GameManager;
