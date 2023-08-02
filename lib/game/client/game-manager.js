/**
 *
 * Reldens - GameManager
 *
 */

const { GameClient } = require('./game-client');
const { GameEngine } = require('./game-engine');
const { RoomEvents } = require('./room-events');
const { ClientStartHandler } = require('./handlers/client-start-handler');
const { FeaturesManager } = require('../../features/client/manager');
const { FirebaseConnector } = require('../../firebase/client/connector');
const { ConfigManager } = require('../../config/client/config-manager');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const Translations = require('./snippets/en_US');
const { GameDom } = require('./game-dom');
const { GameConst } = require('../constants');
const { ErrorManager, EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

class GameManager
{

    constructor()
    {
        // @NOTE: the game engine will be initialized after the user logged in the game that way we will get the full
        // game configuration from the server when the game starts.
        this.gameEngine = false;
        // active room is the currently connected server room:
        this.activeRoomEvents = false;
        this.events = EventsManagerSingleton;
        this.gameDom = GameDom;
        this.config = new ConfigManager();
        this.features = new FeaturesManager({gameManager: this, events: this.events});
        this.firebase = new FirebaseConnector(this);
        this.joinedRooms = {};
        this.userData = {};
        this.plugins = {};
        this.services = {};
        this.elements = {};
        this.playerData = false;
        this.gameOver = false;
        this.forcedDisconnection = false;
        this.isChangingScene = false;
        this.canInitEngine = true;
        this.appServerUrl = '';
        this.gameServerUrl = '';
        this.locale = '';
        TranslationsMapper.forConfig(this.config.client, Translations, GameConst.MESSAGE.DATA_VALUES);
    }

    setupCustomClientPlugin(customPluginKey, customPlugin)
    {
        this.plugins[customPluginKey] = new customPlugin();
        this.plugins[customPluginKey].setup({gameManager: this, events: this.events});
    }

    clientStart()
    {
        this.events.emitSync('reldens.clientStartBefore', this);
        this.startHandler = new ClientStartHandler(this);
        this.startHandler.clientStart();
    }

    startGame(formData, isNewUser)
    {
        this.events.emitSync('reldens.startGameBefore', this);
        let gameRoom = this.joinGame(formData, isNewUser);
        let errorElement = this.gameDom.getElement('#'+formData.formId+' '+GameConst.SELECTORS.RESPONSE_ERROR);
        errorElement.innerHTML = '';
        let body = this.gameDom.getElement(GameConst.SELECTORS.BODY);
        gameRoom.then(() => {
            body.classList.add(GameConst.CLASSES.GAME_STARTED);
            body.classList.remove(GameConst.CLASSES.GAME_ERROR);
            this.gameDom.getElement(GameConst.SELECTORS.FORMS_CONTAINER).remove();
            this.gameDom.getElement(GameConst.SELECTORS.GAME_CONTAINER).classList.remove(GameConst.CLASSES.HIDDEN);
        }).catch((err) => {
            body.classList.remove(GameConst.CLASSES.GAME_STARTED);
            body.classList.add(GameConst.CLASSES.GAME_ERROR);
            // @NOTE: game room errors should be always because some wrong login or registration data. For these cases
            // we will check the isNewUser variable to know where display the error.
            this.submitedForm = false;
            if(errorElement){
                Logger.error(err);
                errorElement.innerHTML = err.message || err;
            }
            if(this.firebase && 'firebase-login' === formData.formId){
                this.firebase.app.auth().signOut();
            }
        });
        this.events.emitSync('reldens.startGameAfter', this);
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
             if(message.error){
                let errorElement = this.gameDom.getElement(
                    GameConst.SELECTORS.PLAYER_CREATE_FORM+' '+GameConst.SELECTORS.RESPONSE_ERROR
                );
                if(errorElement){
                    errorElement.innerHTML = message.message;
                }
                return false;
            }
            // only the current client will get this message:
            if(message.act === GameConst.START_GAME){
                this.initialGameData = message;
                return await this.beforeStartGame();
            }
            if(message.act !== GameConst.CREATE_PLAYER_RESULT){
                return false;
            }
            this.initialGameData.player = message.player;
            let playerSelection = this.gameDom.getElement(GameConst.SELECTORS.PLAYER_SELECTION);
            if(playerSelection){
                playerSelection.classList.add('hidden');
            }
            await this.initEngine();
        });
        this.events.on('reldens.afterSceneDynamicCreate', async () => {
            if(this.config.get('client/ui/screen/responsive')){
                this.gameEngine.updateGameSize(this);
                this.gameDom.getWindow().addEventListener('resize', () => {
                    this.gameEngine.updateGameSize(this);
                });
            }
        });
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
        // @NOTE we leave the game room after the game initialized because at that point the user already
        // joined the scene room and is pointless to keep this room connected since it doesn't listen for
        // any package.
        // this.gameRoom.leave();
        await this.gameRoom.leave();
        this.playerData = this.initialGameData?.player || false;
        if(!this.playerData || !this.playerData.state){
            return this.gameDom.alertReload(this.services?.translator.t('game.errors.missingPlayerData'));
        }
        this.userData.selectedPlayer = this.playerData.id;
        let selectedScene = this.initialGameData?.selectedScene || '';
        this.userData.selectedScene = selectedScene;
        let config = this.initialGameData?.gameConfig || {};
        this.gameEngine = new GameEngine({config, events: this.events});
        // since the user is now registered:
        this.userData.isNewUser = false;
        await this.joinFeaturesRooms();
        let useLastLocation = '' !== selectedScene && selectedScene !== '@lastLocation';
        let playerScene = useLastLocation ? selectedScene : this.playerData.state.scene;
        this.playerData.state.scene = playerScene;
        let joinedFirstRoom = await this.gameClient.joinOrCreate(playerScene, this.userData);
        if(!joinedFirstRoom){
            // @NOTE: the errors while trying to join a rooms/scene will always be originated in the
            // server. For these errors we will alert the user and reload the window automatically.
            return this.gameDom.alertReload(this.services?.translator.t('game.errors.joiningRoom', {playerScene}));
        }
        this.gameDom.getElement(GameConst.SELECTORS.BODY).classList.add(GameConst.CLASSES.GAME_ENGINE_STARTED);
        // @NOTE: remove the selected scene after the player used it because the login data will be used again every
        // time the player change the scene.
        delete this.initialGameData['selectedScene'];
        delete this.userData['selectedScene'];
        await this.events.emit('reldens.joinedRoom', joinedFirstRoom, this);
        await this.events.emit('reldens.joinedRoom_' + playerScene, joinedFirstRoom, this);
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
                    this.gameDom.alertReload(
                        this.services.translator.t('game.errors.joiningFeatureRoom', {joinRoomName})
                    );
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
            // start listen to the new room events:
            await newRoomEvents.activateRoom(sceneRoom, message.prev);
        }).catch((err) => {
            // @NOTE: the errors while trying to reconnect will always be originated in the server. For these errors we
            // will alert the user and reload the window automatically.
            Logger.error('Reconnect Game Client error.', {err, message, previousRoom});
            this.gameDom.alertReload(this.services.translator.t('game.errors.reconnectClient'));
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

    currentPlayerName()
    {
        let currentPlayer = this.getCurrentPlayer();
        if(!currentPlayer){
            return '';
        }
        return currentPlayer.player_id+' - '+currentPlayer.playerName;
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
            Logger.error('Feature key not defined.', featureKey);
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
