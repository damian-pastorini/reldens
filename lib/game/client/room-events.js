/**
 *
 * Reldens - RoomEvents
 *
 */

const { PlayerEngine } = require('../../users/client/player-engine');
const { SceneDynamic } = require('./scene-dynamic');
const { ScenePreloader } = require('./scene-preloader');
const { GameConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class RoomEvents
{

    constructor(roomName, gameManager)
    {
        this.room = false;
        this.roomData = {};
        this.scenePreloader = false;
        this.playersOnAddCallback = false;
        this.playersOnRemoveCallback = false;
        this.playersQueue = {};
        /** @type {GameManager} */
        this.gameManager = gameManager;
        this.gameEngine = gameManager.gameEngine;
        /** @type {GameDom} */
        this.gameDom = gameManager.gameDom;
        this.roomName = roomName;
        this.events = gameManager.events;
        // @TODO - BETA - Move the following inside a single property called "metadata" and set each on their plugins.
        this.objectsUi = {};
        this.tradeUi = {};
        this.gameOverRetries = 0;
        this.gameOverMaxRetries = 0;
        this.gameOverRetryTime = 200;
        this.automaticallyCloseAllDialogsOnSceneChange = gameManager.config.getWithoutLogs(
            'client/rooms/automaticallyCloseAllDialogsOnSceneChange',
            true
        );
    }

    async activateRoom(room, previousScene = false)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        await this.events.emit('reldens.activateRoom', room, this.gameManager);
        this.room = room;
        this.playersOnAddCallback = this.room.state.players.onAdd((player, key) => {
            this.checkAndCreateScene();
            this.playersOnAdd(player, key, previousScene);
            this.listenPlayerAndStateChanges(player, key);
        }); // @NOTE: a second param here with "false" will not automatically run triggerAll().
        this.playersOnRemoveCallback = this.room.state.players.onRemove((player, key) => {
            this.playersOnRemove(player, key);
        });
        this.room.onMessage('*', async (message) => {
            await this.roomOnMessage(message);
        });
        this.room.onLeave((code) => {
            this.roomOnLeave(code);
        });
    }

    listenPlayerAndStateChanges(player, key)
    {
        // @TODO - BETA - Remove hardcoded "state" property and "inState" sub-property.
        let currentPlayerId = this.gameManager.getCurrentPlayer().player_id;
        let playerProps = Object.keys(player);
        let stateProps = Object.keys(player.state);
        for(let prop of playerProps){
            player.listen(prop, (value) => {
                this.playersOnChange(player, key, 'playerChange');
            });
        }
        for(let prop of stateProps){
            player.state.listen(prop, (value) => {
                //Logger.debug('Updating state.', {prop, value});
                player.state[prop] = value;
                this.playersOnChange(player, key, 'playerChange');
                if('inState' === prop && player.player_id === currentPlayerId){
                    if(GameConst.STATUS.DEATH === value){
                        return this.showGameOverBox();
                    }
                    this.hideGameOverBox();
                }
            });
        }
    }

    checkAndCreateScene()
    {
        if(!this.room.state){
            Logger.warning('Room state is not ready.');
            return false;
        }
        // update the room data if is empty:
        if(0 === Object.keys(this.roomData).length){
            this.roomData = sc.toJson(this.room.state.sceneData);
        }
        // avoid create the scene if it exists:
        if(this.gameEngine.scene.getScene(this.roomName)){
            return false;
        }
        let engineSceneDynamic = this.createSceneInstance(this.roomName, this.roomData, this.gameManager);
        this.gameEngine.scene.add(this.roomName, engineSceneDynamic, false);
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
            playedTime: player.playedTime,
            player_id: player.player_id
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
            if(player.player_id === this.gameManager.getCurrentPlayer().player_id && !this.gameManager.isChangingScene){
                Logger.info(
                    'Player scene miss match.',
                    {
                        currentScene: this.roomName,
                        playerSceneOnState: player?.state.scene,
                        player: player?.sessionId,
                        currentPlayer: this.gameManager.getCurrentPlayer()?.playerId,
                        isChangingScene: this.gameManager.isChangingScene
                    }
                );
            }
            return;
        }
        let currentScene = this.getActiveScene();
        if(!this.playerExists(currentScene, key)){
            /* @NOTE: this is expected to happen when the player is being created in the scene.
            Logger.info('Player not found in current scene.', {
                player: currentScene?.player,
                currentKeys: Object.keys(currentScene?.player?.players || {}),
                lookingPlayer: key
            });
            */
            return;
        }
        currentScene.player.updatePlayer(key, player);
    }

    playersOnRemove(player, key)
    {
        this.events.emitSync('reldens.playersOnRemove', player, key, this);
        if(key === this.room.sessionId){
            return this.gameOverReload();
        }
        return this.removePlayerByKey(key);
    }

    removePlayerByKey(key)
    {
        let currentScene = this.getActiveScene();
        if(!this.playerExists(currentScene, key)){
            return;
        }
        currentScene.player.removePlayer(key);
        if(currentScene.player.currentTarget?.id === key){
            this.gameEngine.clearTarget();
        }
    }

    gameOverReload()
    {
        // @TODO - BETA - Improve disconnection handler.
        let defaultReload = {confirmed: true};
        this.events.emitSync('reldens.gameOverReload', this, defaultReload);
        if(!this.gameManager.gameOver && defaultReload.confirmed){
            this.gameDom.alertReload(this.gameManager.services.translator.t('game.errors.sessionEnded'));
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
        await this.runChangingScene(message);
        await this.runChangedScene(message);
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
        if(GameConst.CLOSE_UI_ACTION !== message.act || !message.id){
            return false;
        }
        let closeButton = this.gameDom.getElement('#box-'+message.id+' .box-close');
        if(!closeButton){
            Logger.error('Box could not be closed ID "'+message.id+'".');
            return false;
        }
        closeButton.click();
        return true;
    }

    async runCustomMessageListener(message)
    {
        let listenerKey = sc.get(message, 'listener', '');
        if('' === listenerKey){
            //Logger.debug('ListenerKey undefined for message in room events.', message);
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
        if(!sc.isFunction(listener['executeClientMessageActions'])){
            Logger.error('Listener is missing "executeClientMessageActions" method.', listener);
            return false;
        }
        //Logger.debug({executeClientMessageActions: message});
        listener['executeClientMessageActions']({message, roomEvents: this});
    }

    async runUpdateStats(message)
    {
        if(message.act !== GameConst.PLAYER_STATS){
            return false;
        }
        // @NOTE: now this method will update the stats every time the stats action is received but the UI will be
        // created only once in the preloader.
        await this.events.emit('reldens.playerStatsUpdateBefore', message, this);
        return await this.updatePlayerStats(message);
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

    async runChangingScene(message)
    {
        if(message.act !== GameConst.CHANGING_SCENE || this.room.sessionId !== message.id){
            return false;
        }
        this.gameManager.isChangingScene = true;
        this.closeAllActiveDialogs();
        this.gameManager.getActiveScene().scene.setVisible(false);
    }

    async runChangedScene(message)
    {
        if(
            message.act !== GameConst.CHANGED_SCENE
            || message.scene !== this.room.name
            || this.room.sessionId === message.id
        ){
            return false;
        }
        await this.events.emit('reldens.startChangedScene', {message, roomEvents: this});
        let currentScene = this.getActiveScene();
        // if other users enter the current scene we need to add them:
        let {id, x, y, dir, playerName, playedTime, avatarKey, player_id} = message;
        let topOff = this.gameManager.config.get('client/players/size/topOffset');
        let leftOff = this.gameManager.config.get('client/players/size/leftOffset');
        let addPlayerData = {x: (x - leftOff), y: (y - topOff), dir, playerName, playedTime, avatarKey, player_id};
        currentScene.player.addPlayer(id, addPlayerData);
        this.gameManager.isChangingScene = false;
        await this.events.emit('reldens.endChangedScene', {message, roomEvents: this});
    }

    closeAllActiveDialogs()
    {
        if(!this.automaticallyCloseAllDialogsOnSceneChange){
            return;
        }
        let closeButtons = this.gameDom.getElements(GameConst.SELECTORS.BUTTONS_CLOSE);
        if(0 === closeButtons.length){
            return;
        }
        for(let closeButton of closeButtons){
            closeButton.click();
        }
    }

    async runRevived(message)
    {
        if(message.act !== GameConst.REVIVED){
            return false;
        }
        this.gameDom.getElement('#game-over').classList.add('hidden');
        let currentPlayer = this.gameManager.getCurrentPlayer();
        let showSprite = sc.get(currentPlayer.players, message.t, false);
        if(!showSprite){
            return false;
        }
        showSprite.visible = true;
        if(sc.hasOwn(showSprite, 'nameSprite') && showSprite.nameSprite){
            showSprite.nameSprite.visible = true;
        }
        this.getActiveScene().stopOnDeathOrDisabledSent = false;
    }

    async runGameOver(message)
    {
        if(message.act !== GameConst.GAME_OVER){
            return false;
        }
        try {
            let defaultBehavior = true;
            await this.events.emit('reldens.runGameOver', {message, defaultBehavior, roomEvents: this});
            if(!defaultBehavior){
                return false;
            }
            await this.events.emit('reldens.gameOver', message, this);
            this.gameManager.gameOver = true;
            let currentPlayer = this.gameManager.getCurrentPlayer();
            if(!currentPlayer){
                if(this.gameOverRetries < this.gameOverMaxRetries){
                    setTimeout(() => this.runGameOver(message), this.gameOverRetryTime);
                    this.gameOverRetries++;
                }
                return false;
            }
            let currentPlayerSprite = currentPlayer.players[currentPlayer.playerId];
            currentPlayerSprite.visible = false;
            this.showGameOverBox();
        } catch (error) {
            setTimeout(() => this.runGameOver(message), 200);
            this.gameOverRetries++;
            return false;
        }
    }

    showGameOverBox()
    {
        return this.displayGameOverBox(true);
    }

    hideGameOverBox()
    {
        return this.displayGameOverBox(false);
    }

    displayGameOverBox(display)
    {
        Logger.debug('Display game over box: '+(display ? 'yes' : 'no')+'.');
        let gameOverElement = this.gameDom.getElement('#game-over');
        if(!gameOverElement){
            Logger.debug('GameOver box element not found.');
            return false;
        }
        if(display){
            gameOverElement.classList.remove('hidden');
            return true;
        }
        gameOverElement.classList.add('hidden');
        return false;
    }

    async roomOnLeave(code)
    {
        // @TODO - BETA - Improve disconnection handler.
        if(this.isAbnormalShutdown(code) && !this.gameManager.gameOver && !this.gameManager.forcedDisconnection){
            Logger.error('There was a connection error.', {
                code,
                isGameOver: this.gameManager.gameOver,
                isForcedDisconnection: this.gameManager.forcedDisconnection
            });
            this.gameDom.alertReload(this.gameManager.services.translator.t('game.errors.serverDown'));
        }
        await this.events.emit('reldens.playerLeftScene', {code, roomEvents: this});
        // @NOTE: the client can initiate the disconnection, this is also triggered when the users change the room.
    }

    isAbnormalShutdown(code)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        /*
        1000 - Regular socket shutdown
        Between 1001 and 1015 - Abnormal socket shutdown
        Between 4000 and 4999 - Custom socket close code
        */
        return 1001 <= code && 1015 >= code;
    }

    async updatePlayerStats(message)
    {
        if(!sc.hasOwn(message, 'stats') || !message.stats){
            return false;
        }
        let currentScene = this.getActiveScene();
        if(!currentScene.player || !sc.hasOwn(currentScene.player.players, this.room.sessionId)){
            // @NOTE: this can happen when you get killed and logout, then on login you will have 0 life points and
            // if you get killed automatically again you will hit a player stats update before the player gets ready.
            Logger.error('Player not available.', this.room, currentScene);
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
        if(!uiScene || !sc.hasOwn(uiScene.elementsUi, props.id)){
            Logger.error('User interface not found on UI Scene: '+props.id);
            return false;
        }
        let uiBox = uiScene.elementsUi[props.id];
        this.uiSetTitle(uiBox, props);
        this.uiSetContent(uiBox, props, uiScene);
        let dialogContainer = uiBox.getChildByID('box-'+props.id);
        // @TODO - BETA - Replace styles by classes.
        let shouldSetDisplayNone = props.keepCurrentDisplay && 'none' === dialogContainer.style.display;
        dialogContainer.style.display = shouldSetDisplayNone ? 'none' : 'block';
        // set box depth over the other boxes:
        uiBox.setDepth(2);
        // on dialog display clear the current target:
        if(this.gameManager.config.get('client/ui/uiTarget/hideOnDialog')){
            this.gameEngine.clearTarget();
        }
    }

    uiSetTitleAndContent(uiBox, props, uiScene)
    {
        this.uiSetTitle(uiBox, props);
        this.uiSetContent(uiBox, props, uiScene);
    }

    uiSetTitle(uiBox, props)
    {
        let newTitle = sc.get(props, 'title', false);
        if(false === newTitle){
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
                icon: '/assets/custom/items/'+icon+GameConst.FILES.EXTENSIONS.PNG
            };
            let buttonHtml = this.gameManager.gameEngine.parseTemplate(buttonTemplate, templateVars);
            this.gameDom.appendToElement('#ui-' + props.id, buttonHtml);
            let elementId = '#opt-' + i + '-' + props.id;
            this.gameDom.getElement(elementId)?.addEventListener('click', (event) => {
                let optionSend = {
                    id: props.id,
                    act: GameConst.BUTTON_OPTION,
                    value: event.target.getAttribute('data-option-value')
                };
                let overrideSendOptions = sc.get(props, 'overrideSendOptions', {});
                Object.assign(optionSend, overrideSendOptions);
                this.send(optionSend);
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
        let preloaderName = GameConst.SCENE_PRELOADER+this.roomName;
        !this.gameEngine.scene.getScene(preloaderName)
            ? await this.createPreloaderAndScene(preloaderName, uiScene, player, room, previousScene)
            : await this.createEngineOnScene(preloaderName, player, room, previousScene);
    }

    async createEngineOnScene(preloaderName, player, room, previousScene)
    {
        let currentScene = this.getActiveScene();
        currentScene.objectsAnimationsData = this.roomData.objectsAnimationsData;
        this.scenePreloader = this.gameEngine.scene.getScene(preloaderName);
        await this.events.emit('reldens.createdPreloaderRecurring', this, this.scenePreloader);
        await this.createEngineScene(player, room, previousScene);
    }

    async createPreloaderAndScene(preloaderName, uiScene, player, room, previousScene)
    {
        this.scenePreloader = this.createPreloaderInstance({
            name: preloaderName,
            map: this.roomData.roomMap,
            images: this.roomData.sceneImages,
            uiScene: uiScene,
            gameManager: this.gameManager,
            preloadAssets: this.roomData.preloadAssets,
            objectsAnimationsData: this.roomData.objectsAnimationsData
        });
        this.gameEngine.scene.add(preloaderName, this.scenePreloader, true);
        await this.events.emit('reldens.createdPreloaderInstance', this, this.scenePreloader);
        let preloader = this.gameEngine.scene.getScene(preloaderName);
        preloader.load.on('complete', async () => {
            // set ui on first preloader scene:
            if(!this.gameEngine.uiScene){
                this.gameEngine.uiScene = preloader;
                // if the box right is present then assign the actions:
                this.showPlayerName(this.gameManager.playerData.id + ' - ' + this.gameManager.playerData.name);
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
        let previousSceneInstance = this.gameEngine.scene.getScene(previousScene);
        if(previousSceneInstance){
            previousSceneInstance.scene.setVisible(false);
        }
        // this event happens once for every scene:
        await this.events.emit('reldens.createEngineScene', player, room, previousScene, this);
        if(this.gameManager.room){
            await this.destroyPreviousScene(previousScene, player);
        }
        this.gameEngine.scene.start(player.state.scene);
        this.gameManager.room = room;
        let currentScene = this.gameEngine.scene.getScene(player.state.scene);
        currentScene.player = this.createPlayerEngineInstance(currentScene, player, this.gameManager, room);
        currentScene.player.create();
        this.addExistentPlayers(room, currentScene);
        this.updateSceneLabel(this.roomData.roomTitle);
        // @NOTE: player states must be requested since are private user data that we can share with other players or
        // broadcast to the rooms.
        // request player stats after the player was added to the scene:
        this.send({act: GameConst.PLAYER_STATS});
        // send notification about client joined:
        this.send({act: GameConst.CLIENT_JOINED});
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
            let tmp = this.playerBySessionIdFromState(room, i);
            if(!tmp.sessionId || tmp.sessionId === room.sessionId){
                continue;
            }
            let addPlayerData = {
                x: tmp.state.x,
                y: tmp.state.y,
                dir: tmp.state.dir,
                playerName: tmp.playerName,
                playedTime: tmp.playedTime,
                avatarKey: tmp.avatarKey,
                player_id: tmp.player_id
            };
            currentScene.player.addPlayer(tmp.sessionId, addPlayerData);
        }
    }

    playerBySessionIdFromState(room, i)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        return room.state.players.get(i);
    }

    playersCountFromState(room)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        return room.state.players.size;
    }

    playersKeysFromState(room)
    {
        // @TODO - BETA - Refactor and extract Colyseus into a driver.
        return Array.from(room.state.players.keys());
    }

    async destroyPreviousScene(previousScene)
    {
        if(!previousScene){
            Logger.warning('Missing previous scene data.', previousScene);
            return false;
        }
        let previousSceneInstance = this.gameEngine.scene.getScene(previousScene);
        if(!previousSceneInstance){
            Logger.warning('Missing previous scene instance.', previousSceneInstance);
            return false;
        }
        await previousSceneInstance.changeScene();
        this.gameEngine.scene.stop(previousScene);
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
        return new PlayerEngine({scene: currentScene, playerData: player, gameManager, room, roomEvents: this});
    }

    createPreloaderInstance(props)
    {
        return new ScenePreloader(props);
    }

    send(data, key)
    {
        try {
            if(this.room.connection.transport.ws.readyState === this.room.connection.transport.ws.CLOSED){
                ErrorManager.error('Connection lost.');
            }
            if(this.room.connection.transport.ws.readyState === this.room.connection.transport.ws.CLOSING){
                //Logger.debug('Expected, connection closing.', key, data);
                return false;
            }
            if(!key){
                key = '*';
            }
            this.room.send(key, data);
            return true;
        } catch (error) {
            Logger.critical(error.message, data);
        }
        this.gameDom.alertReload(this.gameManager.services.translator.t('game.errors.connectionLost'));
    }

}

module.exports.RoomEvents = RoomEvents;
