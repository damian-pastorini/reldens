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
const { ConfigManager } = require('../../config/client/config-manager');
const { GameConst } = require('../constants');
const { FirebaseConnector } = require('../../firebase/client/connector');
const { ErrorManager, EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

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
        // disconnection validator:
        this.forcedDisconnection = false;
        // client events:
        this.events = EventsManagerSingleton;
        // game config:
        this.config = new ConfigManager();
        // features manager:
        this.features = new FeaturesManager({gameManager: this, events: this.events});
        // active scene:
        this.isChangingScene = false;
        // dom manager:
        this.gameDom = GameDom;
        // firebase:
        this.firebase = new FirebaseConnector(this);
        // init engine validator:
        this.canInitEngine = true;
        this.appServerUrl = '';
        this.gameServerUrl = '';
    }

    setupCustomClientPlugin(customPlugin)
    {
        this.customPlugin = new customPlugin();
        this.customPlugin.setup({gameManager: this, events: this.events});
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
        this.gameRoom.onMessage('*', async (message) => {
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
                    if(errorElement){
                        errorElement.innerHTML = message.message;
                        errorElement.style.display = 'block';
                        errorElement.classList.remove('hidden');
                    }
                    return false;
                }
                this.initialGameData.player = message.player;
                let playerSelection = this.gameDom.getElement('#player-selection');
                if(playerSelection){
                    playerSelection.classList.add('hidden');
                }
                await this.initEngine();
            }
        });
        // responsive full screen:
        this.events.on('reldens.afterSceneDynamicCreate', () => {
            if(this.config.get('client/ui/screen/responsive')){
                this.gameEngine.updateGameSize(this);
                this.gameDom.getWindow().addEventListener('resize', () => {
                    this.gameEngine.updateGameSize(this);
                });
            }
        });
        // @NOTE: we return the gameRoom here to control the login result actions in the index script.
        return this.gameRoom;
    }

    initializeClient()
    {
        this.appServerUrl = this.getAppServerUrl();
        this.gameServerUrl = this.getGameServerUrl();
        this.gameClient = new GameClient(this.gameServerUrl);
    }

    async beforeStartGame()
    {
        await this.events.emit('reldens.beforeInitEngineAndStartGame', this.initialGameData, this);
        if(!sc.hasOwn(this.initialGameData, 'gameConfig')){
            ErrorManager.error('Missing game configuration.');
        }
        // apply the initial config to the processor:
        sc.deepMergeProperties(this.config, (this.initialGameData?.gameConfig || {}));
        // features list:
        await this.features.loadFeatures((this.initialGameData?.features || {}));
        await this.events.emit('reldens.beforeCreateEngine', this.initialGameData, this);
        if(!this.canInitEngine){
            return false;
        }
        return await this.initEngine();
    }

    async initEngine()
    {
        // we don't need the user on the game room anymore:
        await this.gameRoom.leave();
        // save the selected player data:
        this.playerData = this.initialGameData?.player || false;
        if(!this.playerData || !this.playerData.state){
            return this.gameDom.alertReload('ERROR - Missing player data.');
        }
        this.userData.selectedPlayer = this.playerData.id;
        let selectedScene = this.initialGameData?.selectedScene || '';
        this.userData.selectedScene = selectedScene;
        // initialize game engine:
        let config = this.initialGameData?.gameConfig || {};
        this.gameEngine = new GameEngine({config, events: this.events});
        // since the user is now registered:
        this.userData.isNewUser = false;
        // first join the features rooms:
        await this.joinFeaturesRooms();
        // create room events manager:
        let useLastLocation = '' !== selectedScene && selectedScene !== '@lastLocation';
        let playerScene = useLastLocation ? selectedScene : this.playerData.state.scene;
        this.playerData.state.scene = playerScene;
        let joinedFirstRoom = await this.gameClient.joinOrCreate(playerScene, this.userData);
        if(!joinedFirstRoom){
            // @NOTE: the errors while trying to join a rooms/scene will always be originated in the
            // server. For these errors we will alert the user and reload the window automatically.
            return this.gameDom.alertReload('ERROR - There was an error while joining the room: '+playerScene);
        }
        // @NOTE: remove the selected scene after the player used it because the login data will be used again every
        // time the player change the scene.
        delete this.initialGameData['selectedScene'];
        delete this.userData['selectedScene'];
        await this.events.emit('reldens.joinedRoom', joinedFirstRoom, this);
        await this.events.emit('reldens.joinedRoom_' + playerScene, joinedFirstRoom, this);
        // start listening the new room events:
        this.activeRoomEvents = this.createRoomEventsInstance(playerScene, this.events);
        await this.events.emit('reldens.createdRoomsEventsInstance', joinedFirstRoom, this);
        await this.activeRoomEvents.activateRoom(joinedFirstRoom);
        await this.events.emit('reldens.afterInitEngineAndStartGame', this.initialGameData, joinedFirstRoom);
        return joinedFirstRoom;
    }

    async joinFeaturesRooms()
    {
        let featuresListKeys = Object.keys(this.features.featuresList);
        if(0 === featuresListKeys.length){
            return;
        }
        for(let i of featuresListKeys){
            let feature = this.features.featuresList[i];
            if(!sc.hasOwn(feature, 'joinRooms')){
                continue;
            }
            for(let joinRoomName of feature.joinRooms){
                let joinedRoom = await this.gameClient.joinOrCreate(joinRoomName, this.userData);
                if(!joinedRoom){
                    // @NOTE: any join room error will always be originated in the server. For these errors we
                    // will alert the user and reload the window automatically. Here the received "data" will
                    // be the actual error message.
                    this.gameDom.alertReload('ERROR - There was an error while joining the room '+joinRoomName);
                }
                // after the room was joined added to the joinedRooms list:
                this.joinedRooms[joinRoomName] = joinedRoom;
                await this.events.emit('reldens.joinedRoom', joinedRoom, this);
                await this.events.emit('reldens.joinedRoom_'+joinRoomName, joinedRoom, this);
            }
        }
    }

    async reconnectGameClient(message, previousRoom)
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
            Logger.error(['Reconnect Game Client:', err, 'message:', message, 'previousRoom:', previousRoom]);
            this.gameDom.alertReload(err);
        });
    }

    createRoomEventsInstance(roomName)
    {
        return new RoomEvents(roomName, this, this.events);
    }

    getAppServerUrl()
    {
        if('' === this.appServerUrl){
            this.appServerUrl = this.getUrlFromCurrentReferer();
        }
        return this.appServerUrl;
    }

    getGameServerUrl()
    {
        if('' === this.gameServerUrl){
            this.gameServerUrl = this.getUrlFromCurrentReferer(true);
        }
        return this.gameServerUrl;
    }

    getUrlFromCurrentReferer(useWebSocket = false)
    {
        let protocol = this.gameDom.getWindow().location.protocol;
        if(useWebSocket){
            protocol = protocol.indexOf('https') === 0 ? 'wss:' : 'ws:';
        }
        protocol = protocol + '//';
        let host = this.gameDom.getWindow().location.hostname;
        let port = (this.gameDom.getWindow().location.port ? ':'+this.gameDom.getWindow().location.port : '');
        return protocol+host+port;
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
        let activeScene = this.getActiveScene();
        if(!activeScene){
            return false;
        }
        return activeScene.player;
    }

    getCurrentPlayerAnimation()
    {
        let current = this.getCurrentPlayer();
        return current.players[current.playerId];
    }

    getUiElement(uiName, logError = true)
    {
        let uiScene = sc.get(this.gameEngine, 'uiScene', false);
        if(uiScene){
            return uiScene.getUiElement(uiName, logError);
        }
        if(logError){
            Logger.error('UI Scene not defined.');
        }
        return false;
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

    displayForgotPassword()
    {
        // @TODO - BETA - Extract.
        this.gameDom.getJSON(this.appServerUrl+'/reldens-mailer-enabled', (err, response) => {
            if(!response.enabled){
                return;
            }
            this.gameDom.getElement('.forgot-password-container').classList.remove('hidden');
        });
    }

}

module.exports.GameManager = GameManager;
