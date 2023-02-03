/**
 *
 * Reldens - RoomEvents
 *
 */

const { PlayerEngine } = require('../../users/client/player-engine');
const { SceneDynamic } = require('./scene-dynamic');
const { ScenePreloader } = require('./scene-preloader');
const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class RoomEvents
{

    constructor(roomName, gameManager)
    {
        this.room = false;
        this.sceneData = false;
        this.scenePreloader = false;
        this.playersQueue = {};
        this.gameManager = gameManager;
        this.gameEngine = gameManager.gameEngine;
        this.roomName = roomName;
        this.events = gameManager.events;
        // @TODO - BETA - Move the following inside a single property called "metadata".
        this.objectsUi = {};
        this.tradeUi = {};
        this.teamUi = {};
    }

    async activateRoom(room, previousScene = false)
    {
        await this.events.emit('reldens.activateRoom', room, this.gameManager);
        this.room = room;
        // listen to changes coming from the server:
        this.room.state.players.onAdd = (player, key) => {
            this.checkAndCreateScene();
            this.playersOnAdd(player, key, previousScene);
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
        if(this.gameEngine.scene.getScene(this.roomName)){
            return;
        }
        let engineSceneDynamic = this.createSceneInstance(this.roomName, this.sceneData, this.gameManager);
        this.gameEngine.scene.add(this.roomName, engineSceneDynamic, false);
    }

    mapChanges(changes)
    {
        let mappedFieldValues = {};
        for(let change of changes){
            mappedFieldValues[change.field] = change.value;
        }
        return mappedFieldValues;
    }

    async playersOnAdd(player, key, previousScene)
    {
        await this.events.emit('reldens.playersOnAdd', player, key, previousScene, this);
        let mappedData = {
            x: player.state.x,
            y: player.state.y,
            dir: player.state.dir,
            playerName: player.playerName,
            avatarKey: player.avatarKey,
            playedTime: player.playedTime
        };
        if(this.isCurrentPlayer(key)){
            return await this.createCurrentPlayer(player, previousScene, key);
        }
        this.addOtherPlayers(player, key, mappedData);
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
        key === this.room.sessionId ? this.gameOverReload() : this.removePlayerByKey(key);
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
        await this.closeBox(message);
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

    async closeBox(message)
    {
        if(GameConst.CLOSE_UI_ACTION === message.act && '' !== message.id){
            let closeButton = this.gameManager.gameDom.getElement('#box-'+message.id+' .box-close');
            if(closeButton){
                closeButton.click();
                return true;
            }
            Logger.error('Box could not be closed ID "'+message.id+'".');
            return false;
        }
    }

    async runCustomMessageListener(message)
    {
        let listenerKey = sc.get(message, 'listener', '');
        if('' === listenerKey){
            return false;
        }
        let defaultListeners = this.gameManager.config.get('client/message/listeners', {});
        let customListeners = this.gameManager.config.get('client/customClasses/message/listeners', {});
        let listener = sc.get(customListeners, listenerKey, false);
        if(!listener){
            listener = sc.get(defaultListeners, listenerKey, false);
        }
        if(!listener){
            Logger.error('Listener "'+listenerKey+'" is missing.');
            return false;
        }
        if(!sc.isObjectFunction(listener, 'executeClientMessageActions')){
            Logger.error('Listener is missing "executeClientMessageActions" method.', listener);
            return false;
        }
        listener.executeClientMessageActions({message, roomEvents: this});
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
        this.closeAllActiveDialogs();
        await this.events.emit('reldens.changedScene', message, this);
        let currentScene = this.getActiveScene();
        // if other users enter the current scene we need to add them:
        let {id, x, y, dir, playerName, playedTime, avatarKey} = message;
        let topOff = this.gameManager.config.get('client/players/size/topOffset');
        let leftOff = this.gameManager.config.get('client/players/size/leftOffset');
        let addPlayerData = {x: (x - leftOff), y: (y - topOff), dir, playerName, playedTime, avatarKey};
        currentScene.player.addPlayer(id, addPlayerData);
    }

    closeAllActiveDialogs()
    {
        let closeButtons = this.gameManager.gameDom.getElements('.ui-box .box-close');
        if(0 < closeButtons.length){
            for(let closeButton of closeButtons){
                closeButton.click();
            }
        }
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
        if(code > 1001 && !this.gameManager.gameOver && !this.gameManager.forcedDisconnection){
            Logger.error('There was a connection error.', ['Error Code:', code]);
        }
        // @NOTE: the client can initiate the disconnection, this is also triggered when the users change the room.
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
        let playerStats = this.gameManager.getUiElement('playerStats');
        if(!playerStats){
            return false;
        }
        let statsPanel = playerStats.getChildByProperty('id', 'player-stats-container');
        if(!statsPanel){
            return false;
        }
        let messageTemplate = this.gameEngine.uiScene.cache.html.get('playerStat');
        statsPanel.innerHTML = '';
        for(let i of Object.keys(message.stats)){
            let statData = sc.get(this.gameManager.config.client.players.initialStats[i], 'data', false);
            let baseStatValue = (statData && sc.get(statData, 'showBase', false) ? ' / '+message.statsBase[i] : '');
            let parsedStatsTemplate = this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                statLabel: i,
                statValue: message.stats[i] + baseStatValue
            });
            statsPanel.innerHTML = statsPanel.innerHTML+parsedStatsTemplate;
        }
        await this.events.emit('reldens.playerStatsUpdateAfter', message, this);
    }

    initUi(props)
    {
        let uiScene = this.gameEngine.uiScene;
        if(!uiScene || !sc.hasOwn(uiScene.userInterfaces, props.id)){
            Logger.error('User interface not found on UI Scene: '+props.id);
            return false;
        }
        let uiBox = uiScene.userInterfaces[props.id];
        this.uiSetTitle(uiBox, props);
        this.uiSetContent(uiBox, props, uiScene);
        let dialogContainer = uiBox.getChildByID('box-'+props.id);
        dialogContainer.style.display = 'block';
        // set box depth over the other boxes:
        uiBox.setDepth(2);
        // on dialog display clear the current target:
        if(this.gameManager.config.get('client/ui/uiTarget/hideOnDialog')){
            this.gameEngine.clearTarget();
        }
    }

    uiSetTitle(uiBox, props)
    {
        let newTitle = sc.get(props, 'title', false);
        if(false === sc.get(props, 'title', false)){
            return false;
        }
        let boxTitle = uiBox.getChildByProperty('className', 'box-title');
        if(!boxTitle){
            return false;
        }
        boxTitle.innerHTML = newTitle;
    }

    uiSetContent(uiBox, props, uiScene)
    {
        let newContent = sc.get(props, 'content', false);
        if(false === newContent){
            return false;
        }
        let boxContent = uiBox.getChildByProperty('className', 'box-content');
        if(!boxContent){
            return false;
        }
        boxContent.innerHTML = newContent;
        this.uiSetContentOptions(uiScene, props, boxContent);
    }

    uiSetContentOptions(uiScene, props, boxContent)
    {
        if(!props.options){
            return false;
        }
        // @TODO - BETA - IMPROVE! I need time to focus on this which I don't have right now :(
        let optionsContainerTemplate = uiScene.cache.html.get('uiOptionsContainer');
        let optionsContainer = this.gameManager.gameEngine.parseTemplate(
            optionsContainerTemplate,
            {id: 'ui-' + props.id}
        );
        boxContent.innerHTML += optionsContainer;
        let optionsKeys = Object.keys(props.options);
        if(0 === optionsKeys.length){
            return false;
        }
        for(let i of optionsKeys){
            let {label, value, icon} = props.options[i];
            let optTemplate = icon ? 'Icon' : 'Button';
            let buttonTemplate = uiScene.cache.html.get('uiOption' + optTemplate);
            let templateVars = {
                id: i,
                object_id: props.id,
                label,
                value,
                icon: '/assets/custom/items/' + icon + '.png'
            };
            let buttonHtml = this.gameManager.gameEngine.parseTemplate(buttonTemplate, templateVars);
            this.gameManager.gameDom.appendToElement('#ui-' + props.id, buttonHtml);
            let elementId = '#opt-' + i + '-' + props.id;
            this.gameManager.gameDom.getElement(elementId)?.addEventListener('click', (event) => {
                let optionSend = {
                    id: props.id,
                    act: GameConst.BUTTON_OPTION,
                    value: event.target.getAttribute('data-option-value')
                };
                let overrideSendOptions = sc.get(props, 'overrideSendOptions', {});
                Object.assign(optionSend, overrideSendOptions);
                this.room.send('*', optionSend);
            });
        }
    }

    async startEngineScene(player, room, previousScene = false)
    {
        await this.events.emit('reldens.startEngineScene', this, player, room, previousScene);
        let uiScene = false;
        if(!this.gameEngine.uiScene){
            uiScene = true;
        }
        let preloaderName = GameConst.SCENE_PRELOADER+this.sceneData.roomName;
        !this.gameEngine.scene.getScene(preloaderName)
            ? await this.createPreloaderAndScene(preloaderName, uiScene, player, room, previousScene)
            : await this.createEngineOnScene(preloaderName, player, room, previousScene);
    }

    async createEngineOnScene(preloaderName, player, room, previousScene)
    {
        let currentScene = this.getActiveScene();
        currentScene.objectsAnimationsData = this.sceneData.objectsAnimationsData;
        this.scenePreloader = this.gameEngine.scene.getScene(preloaderName);
        await this.events.emit('reldens.createdPreloaderRecurring', this, this.scenePreloader);
        await this.createEngineScene(player, room, previousScene);
    }

    async createPreloaderAndScene(preloaderName, uiScene, player, room, previousScene)
    {
        this.scenePreloader = this.createPreloaderInstance({
            name: preloaderName,
            map: this.sceneData.roomMap,
            images: this.sceneData.sceneImages,
            uiScene: uiScene,
            gameManager: this.gameManager,
            preloadAssets: this.sceneData.preloadAssets,
            objectsAnimationsData: this.sceneData.objectsAnimationsData
        });
        this.gameEngine.scene.add(preloaderName, this.scenePreloader, true);
        await this.events.emit('reldens.createdPreloaderInstance', this, this.scenePreloader);
        let preloader = this.gameEngine.scene.getScene(preloaderName);
        preloader.load.on('complete', async () => {
            // set ui on first preloader scene:
            if(!this.gameEngine.uiScene){
                // assign the preloader:
                this.gameEngine.uiScene = preloader;
                // if the box right is present then assign the actions:
                this.showPlayerName(this.gameManager.playerData.name);
            }
            await this.createEngineScene(player, room, previousScene);
        });
    }

    showPlayerName(playerName)
    {
        let playerBox = this.gameManager.getUiElement('playerBox');
        if(!playerBox){
            return false;
        }
        let element = playerBox.getChildByProperty('className', 'player-name');
        if(!element){
            return false;
        }
        element.innerHTML = playerName;
    }

    async createEngineScene(player, room, previousScene)
    {
        // this event happens once for every scene:
        await this.events.emit('reldens.createEngineScene', player, room, previousScene, this);
        !this.gameManager.room
            ? this.gameEngine.scene.start(player.state.scene)
            : await this.destroyPreviousScene(previousScene, player);
        this.gameManager.room = room;
        let currentScene = this.gameEngine.scene.getScene(player.state.scene);
        currentScene.player = this.createPlayerEngineInstance(currentScene, player, this.gameManager, room);
        currentScene.player.create();
        this.addExistentPlayers(room, currentScene);
        this.updateSceneLabel(this.sceneData.roomTitle);
        // @NOTE: player states must be requested since are private user data that we can share with other players or
        // broadcast to the rooms.
        // request player stats after the player was added to the scene:
        this.room.send('*', {act: GameConst.PLAYER_STATS});
        // send notification about client joined:
        this.room.send('*', {act: GameConst.CLIENT_JOINED});
        let playerAddEventData = { player: currentScene.player, previousScene, roomEvents: this};
        await this.events.emit('reldens.playersOnAddReady', playerAddEventData);
        let eventData = {currentScene, previousScene, roomEvents: this};
        await this.events.emit('reldens.createEngineSceneDone', eventData);
        return eventData;
    }

    addExistentPlayers(room, currentScene)
    {
        if(0 === this.playersCountFromState(room)){
            return false;
        }
        for(let i of this.playersKeysFromState(room)){
            let tmp = room.state.players.get(i);
            if(!tmp.sessionId || tmp.sessionId === room.sessionId){
                continue;
            }
            let addPlayerData = {
                x: tmp.state.x,
                y: tmp.state.y,
                dir: tmp.state.dir,
                playerName: tmp.playerName,
                playedTime: tmp.playedTime,
                avatarKey: tmp.avatarKey
            };
            currentScene.player.addPlayer(tmp.sessionId, addPlayerData);
        }
    }

    playerByIdFromState(room, i)
    {
        return room.state.players.get(i);
    }

    playersCountFromState(room)
    {
        return room.state.players.size;
    }

    playersKeysFromState(room)
    {
        return Array.from(room.state.players.keys());
    }

    async destroyPreviousScene(previousScene, player)
    {
        if(!previousScene || !this.gameEngine.scene.getScene(previousScene)){
            return false;
        }
        // destroy previous scene tile set:
        await this.gameEngine.scene.getScene(previousScene).changeScene();
        // stop the previous scene and start the new one:
        this.gameEngine.scene.stop(previousScene);
        this.gameEngine.scene.start(player.state.scene);
    }

    updateSceneLabel(newLabel)
    {
        let sceneLabel = this.gameManager.getUiElement('sceneLabel');
        // if scene label is visible assign the data to the box:
        if(!sceneLabel){
            return false;
        }
        let element = sceneLabel.getChildByProperty('className', 'scene-label');
        if(!element){
            return false;
        }
        element.innerHTML = newLabel;
    }

    getActiveScene()
    {
        return this.gameEngine.scene.getScene(this.roomName);
    }

    createSceneInstance(sceneName, sceneData, gameManager)
    {
        return new SceneDynamic(sceneName, sceneData, gameManager);
    }

    createPlayerEngineInstance(currentScene, player, gameManager, room)
    {
        return new PlayerEngine({scene: currentScene, playerData: player, gameManager, room});
    }

    createPreloaderInstance(props)
    {
        return new ScenePreloader(props);
    }

}

module.exports.RoomEvents = RoomEvents;
