/**
 *
 * Reldens - RoomEvents
 *
 * This class will listen the scene-rooms and run the related actions, it will also register the other modules action
 * into the room events.
 *
 */

const { SceneDynamic } = require('./scene-dynamic');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class RoomEvents
{

    constructor(roomName, gameManager)
    {
        this.room = false;
        this.sceneData = false;
        this.playersQueue = {};
        this.gameManager = gameManager;
        this.gameEngine = gameManager.gameEngine;
        this.roomName = roomName;
        this.events = gameManager.events;
        this.objectsUi = {};
        this.gameEngine.roomEventsOnSceneCompleteLoad = ((currentScene, previousScene) => this.onCurrentSceneCompleted(currentScene, previousScene));
    }

    async activateRoom(room, previousScene = false)
    {
        console.log('activate room');
        console.log(room);
        console.log(previousScene);
        await this.events.emit('reldens.activateRoom', room, this.gameManager);
        this.room = room;
        // listen to changes coming from the server:
        this.room.state.players.onAdd = (player, key) => {
            this.checkAndCreateScene();
            this.addPlayerToScene(player, key, previousScene);
            this.listenPlayerAndStateChanges(player, key);
        };
        this.room.state.players.onRemove = (player, key) => {
            this.playersOnRemove(player, key);
        };
        // create players or change scenes:
        this.room.onMessage('*', async (message) => {
            await this.roomOnMessage(message);
        });
        this.room.onLeave((code) => {
            this.roomOnLeave(code);
        });
    }

    listenPlayerAndStateChanges(player, key)
    {
        player.onChange = (changes) => {
            let mappedChanges = this.mapChanges(changes);
            Object.assign(player, mappedChanges);
            this.playersOnChange(player, key, 'playerChange');
        };
        player.state.onChange = (changes, prevState) => {
            let mappedState = this.mapChanges(changes);
            Object.assign(player.state, mappedState);
            this.playersOnChange(player, player.sessionId, 'stateUpdate');
        };
    }

    checkAndCreateScene()
    {
        if(!this.room.state || this.room.state.sceneData === this.sceneData){
            return;
        }
        this.sceneData = sc.toJson(this.room.state.sceneData);
        this.gameEngine.setSceneData(this.sceneData);
        this.gameEngine.setActiveSceneName(this.roomName);
        if(this.gameEngine.getScene(this.roomName)){
            return;
        }
        let engineSceneDynamic = this.createSceneInstance(this.roomName, this.sceneData, this.gameManager);
        this.gameEngine.addScene(this.roomName, engineSceneDynamic, false);
    }

    mapChanges(changes)
    {
        let mappedFieldValues = {};
        for(let change of changes){
            mappedFieldValues[change.field] = change.value;
        }
        return mappedFieldValues;
    }

    async addPlayerToScene(player, key, previousScene)
    {
        await this.events.emit('reldens.playersOnAdd', player, key, previousScene, this);
        if(this.isCurrentPlayer(key)){
            await this.createCurrentPlayer(player, previousScene, key);
        } else {
            let mappedData = this.createOtherPlayerData(player);
            this.addOtherPlayers(player, key, mappedData);
        }
    }

    createOtherPlayerData(player)
    {
        return {
            x: player.state.x,
            y: player.state.y,
            dir: player.state.dir,
            playerName: player.playerName,
            avatarKey: player.avatarKey,
            playedTime: player.playedTime
        };
    }

    isCurrentPlayer(key)
    {
        return key === this.room.sessionId;
    }

    addOtherPlayers(player, key, addPlayerData)
    {
        // add new players into the current player scene:
        if(!this.engineStarted){
            this.playersQueue[key] = addPlayerData;
            return false;
        }
        let currentScene = this.getActiveScene();
        if(!this.isValidScene(currentScene, player)){
            // we don't want to add players from another scene here:
            return false;
        }
        currentScene.player.addPlayer(key, addPlayerData);
    }

    async createCurrentPlayer(player, previousScene, key)
    {
        this.engineStarted = true;
        await this.startEngineScene(player, this.room, previousScene);
        let currentScene = this.getActiveScene();
        if(!this.isValidScene(currentScene, player)){
            return false;
        }
        // process players queue after player was created:
        await this.events.emit('reldens.playersQueueBefore', player, key, previousScene, this);
        for(let i of Object.keys(this.playersQueue)){
            currentScene.player.addPlayer(i, this.playersQueue[i]);
        }
        let eventData = {player, key, previousScene, roomEvents: this};
        await this.events.emit('reldens.createCurrentPlayer', eventData);
        return eventData;
    }

    isValidScene(currentScene, player)
    {
        return currentScene.key === player.state.scene && currentScene.player && currentScene.player.players;
    }

    playersOnChange(player, key, from)
    {
        // do not move the player if it is changing the scene:
        if(player.state.scene !== this.roomName){
            return;
        }
        let currentScene = this.getActiveScene();
        if(!this.playerExists(currentScene, key)){
            return;
        }
        currentScene.player.updatePlayer(key, player);
    }

    playersOnRemove(player, key)
    {
        this.events.emitSync('reldens.playersOnRemove', player, key, this);
        if (key === this.room.sessionId) {
            this.gameOverReload();
        } else {
            this.removePlayerByKey(key);
        }
    }

    removePlayerByKey(key)
    {
        let currentScene = this.getActiveScene();
        if(this.playerExists(currentScene, key)){
            // remove your player entity from the game world:
            currentScene.player.removePlayer(key);
        }
    }

    gameOverReload()
    {
        // @TODO - BETA - Improve disconnection handler.
        let defaultReload = {confirmed: true};
        this.events.emitSync('reldens.gameOverReload', this, defaultReload);
        if(!this.gameManager.gameOver && defaultReload.confirmed){
            alert('Your session ended, please login again.');
            this.gameManager.gameDom.getWindow().location.reload();
        }
    }

    playerExists(currentScene, key)
    {
        return currentScene.player && sc.hasOwn(currentScene.player.players, key);
    }

    async roomOnMessage(message)
    {
        await this.runGameOver(message);
        await this.runRevived(message);
        await this.runChangeScene(message);
        await this.runReconnect(message);
        await this.runUpdateStats(message);
        await this.runInitUi(message);
        await this.runCustomMessageListener(message);
    }

    async runInitUi(message)
    {
        if(message.act !== GameConst.UI || !message.id){
            return false;
        }
        await this.events.emit('reldens.initUiBefore', message, this);
        this.initUi(message);
        await this.events.emit('reldens.initUiAfter', message, this);
    }

    async runCustomMessageListener(message)
    {
        let listenerKey = sc.get(message, 'listener', '');
        if('' === listenerKey){
            return false;
        }
        let defaultListeners = this.gameManager.config.get('client/message/listeners') || {};
        let customListeners = this.gameManager.config.get('client/customClasses/message/listeners') || {};
        let listener = sc.get(customListeners, listenerKey, false);
        if(!listener){
            listener = sc.get(defaultListeners, listenerKey, false);
        }
        if(!listener || !sc.isFunction(listener, 'executeClientMessageActions')){
            return false;
        }
        await listener.executeClientMessageActions({message, roomEvents: this});
    }

    async runUpdateStats(message)
    {
        if(message.act !== GameConst.PLAYER_STATS){
            return false;
        }
        // @NOTE: now this method will update the stats every time the stats action is received but the UI will be
        // created only once in the preloader.
        await this.events.emit('reldens.playerStatsUpdateBefore', message, this);
        await this.updatePlayerStats(message);
    }

    async runReconnect(message)
    {
        if(message.act !== GameConst.RECONNECT){
            return false;
        }
        // @NOTE: here we don't need to evaluate the id since reconnect only is sent to the current client.
        await this.events.emit('reldens.beforeReconnectGameClient', message, this);
        await this.gameManager.reconnectGameClient(message, this.room);
    }

    async runChangeScene(message)
    {
        if(
            message.act !== GameConst.CHANGED_SCENE
            || message.scene !== this.room.name
            || this.room.sessionId === message.id
        ){
            return false;
        }
        await this.events.emit('reldens.changedScene', message, this);
        let currentScene = this.getActiveScene();
        // if other users enter the current scene we need to add them:
        let {id, x, y, dir, playerName, playedTime, avatarKey} = message;
        let topOff = this.gameManager.config.get('client/players/size/topOffset');
        let leftOff = this.gameManager.config.get('client/players/size/leftOffset');
        let addPlayerData = {
            x: (x - leftOff),
            y: (y - topOff),
            dir,
            playerName,
            playedTime,
            avatarKey
        };
        currentScene.player.addPlayer(id, addPlayerData);
    }

    async runRevived(message)
    {
        if(message.act !== GameConst.REVIVED){
            return false;
        }
        this.gameManager.gameDom.getElement('#game-over').classList.add('hidden');
        let currentPlayer = this.gameManager.getCurrentPlayer();

        let showSprite = sc.get(currentPlayer.players, message.t, false);
        if(!showSprite){
            return false;
        }
        showSprite.visible = true;
        if(sc.hasOwn(showSprite, 'nameSprite') && showSprite.nameSprite){
            showSprite.nameSprite.visible = true;
        }
    }

    async runGameOver(message)
    {
        if(message.act !== GameConst.GAME_OVER){
            return false;
        }
        let defaultBehavior = true;
        await this.events.emit('reldens.runGameOver', {message, defaultBehavior, roomEvents: this});
        if(!defaultBehavior){
            return false;
        }
        await this.events.emit('reldens.gameOver', message, this);
        this.gameManager.gameOver = true;
        let currentPlayer = this.gameManager.getCurrentPlayer();
        let currentPlayerSprite = currentPlayer.players[currentPlayer.playerId];
        currentPlayerSprite.visible = false;
        this.gameManager.gameDom.getElement('#game-over').classList.remove('hidden');
    }

    roomOnLeave(code)
    {
        // @TODO - BETA - Improve disconnection handler.
        // server disconnection handler:
        if(code > 1001 && !this.gameManager.gameOver && !this.gameManager.forcedDisconnection){
            Logger.error('There was a connection error.', ['Error Code:', code]);
        } else {
            // @NOTE: the client can initiate the disconnection, this is also triggered when the users change the room.
        }
    }

    async updatePlayerStats(message)
    {
        if(!sc.hasOwn(message, 'stats') || !message.stats){
            return false;
        }
        let currentScene = this.getActiveScene();
        if(!currentScene.player || !sc.hasOwn(currentScene.player.players, this.room.sessionId)){
            Logger.error('For some reason you hit this case which should not happen.', this.room, currentScene);
            return false;
        }
        let playerSprite = currentScene.player.players[this.room.sessionId];
        playerSprite.stats = message.stats;
        this.gameManager.playerData.stats = message.stats;
        this.gameManager.playerData.statsBase = message.statsBase;

        let statsPanel = this.gameEngine.uiSceneManager.uiSceneDriver.usingElementUi().getElementChildByID('playerStats', 'player-stats-container');
        statsPanel.innerHTML = '';

        for(let i of Object.keys(message.stats)){
            let statData = sc.get(this.gameManager.config.client.players.initialStats[i], 'data', false);
            let baseStatValue = (statData && sc.get(statData, 'showBase', false) ? ' / '+message.statsBase[i] : '');
            const parsedStatsTemplate = this.gameEngine.uiSceneManager.uiSceneDriver.usingElementUi().parseLoadedContent('playerStat', {
                statLabel: i,
                statValue: message.stats[i] + baseStatValue
            });
            statsPanel.innerHTML += parsedStatsTemplate;
        }
        await this.events.emit('reldens.playerStatsUpdateAfter', message, this);
    }

    initUi(props)
    {
        let uiSceneDriver = this.gameEngine.uiSceneManager.uiSceneDriver;
        if(!uiSceneDriver || !sc.hasOwn(uiSceneDriver.scene.userInterfaces, props.id)){
            return false;
        }
        this.gameEngine.uiSceneManager.updateUi(props);
    }

    async startEngineScene(player, room, previousScene = false)
    {
        await this.events.emit('reldens.startEngineScene', this, player, room, previousScene);
        await this.gameEngine.start(player, room, previousScene);
    }

    getActiveScene()
    {
        return this.gameManager.getActiveScene();
    }

    createSceneInstance(sceneName, sceneData, gameManager)
    {
        return new SceneDynamic(sceneName, sceneData, gameManager);
    }

    async onCurrentSceneCompleted(currentScene, previousScene)
    {
        // @NOTE: player states must be requested since are private user data that we can share with other players or
        // broadcast to the rooms.
        // request player stats after the player was added to the scene:
        this.room.send('*', {act: GameConst.PLAYER_STATS});
        // send notification about client joined:
        this.room.send('*', {act: GameConst.CLIENT_JOINED});
        let playerAddEventData = {player: currentScene.player, previousScene, roomEvents: this};
        await this.events.emit('reldens.playersOnAddReady', playerAddEventData);
        let eventData = {currentScene, previousScene, roomEvents: this};
        await this.events.emit('reldens.createEngineSceneDone', eventData);
    }
}

module.exports.RoomEvents = RoomEvents;
