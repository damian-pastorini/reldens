/**
 *
 * Reldens - RoomEvents
 *
 * Manages Colyseus room event handlers for the client-side game. Handles player add/remove events,
 * room state synchronization, scene creation and preloading, player state changes (death, respawn),
 * and coordinates with GameManager, GameEngine, and Phaser scenes. Listens to server room messages
 * and player state updates. Manages game over screen display and retry logic.
 *
 */

const { PlayerEngine } = require('../../users/client/player-engine');
const { SceneDynamic } = require('./scene-dynamic');
const { ScenePreloader } = require('./scene-preloader');
const { GameConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('colyseus.js').Room} Room
 * @typedef {import('./game-manager').GameManager} GameManager
 * @typedef {import('./game-engine').GameEngine} GameEngine
 * @typedef {import('./game-dom').GameDom} GameDom
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../users/client/player-engine').PlayerEngine} PlayerEngine
 * @typedef {import('./scene-dynamic').SceneDynamic} SceneDynamic
 * @typedef {import('./scene-preloader').ScenePreloader} ScenePreloader
 */
class RoomEvents
{

    /**
     * @param {string} roomName
     * @param {GameManager} gameManager
     */
    constructor(roomName, gameManager)
    {
        /** @type {Room|false} */
        this.room = false;
        /** @type {object} */
        this.roomData = {};
        /** @type {ScenePreloader|false} */
        this.scenePreloader = false;
        /** @type {Function|false} */
        this.playersOnAddCallback = false;
        /** @type {Function|false} */
        this.playersOnRemoveCallback = false;
        /** @type {Object<string, object>} */
        this.playersQueue = {};
        /** @type {GameManager} */
        this.gameManager = gameManager;
        /** @type {GameEngine} */
        this.gameEngine = gameManager.gameEngine;
        /** @type {GameDom} */
        this.gameDom = gameManager.gameDom;
        /** @type {string} */
        this.roomName = roomName;
        /** @type {EventsManager} */
        this.events = gameManager.events;
        /** @type {Object<string, object>} */
        this.objectsUi = {};
        /** @type {object} */
        this.tradeUi = {};
        /** @type {number} */
        this.gameOverRetries = 0;
        /** @type {number} */
        this.gameOverMaxRetries = 0;
        /** @type {number} */
        this.gameOverRetryTime = 200;
        /** @type {boolean} */
        this.automaticallyCloseAllDialogsOnSceneChange = gameManager.config.getWithoutLogs(
            'client/rooms/automaticallyCloseAllDialogsOnSceneChange',
            true
        );
    }

    /**
     * @param {Room} room
     * @param {string|boolean} [previousScene]
     * @returns {Promise<void>}
     */
    async activateRoom(room, previousScene = false)
    {
        await this.events.emit('reldens.activateRoom', room, this.gameManager);
        this.room = room;
        this.playersOnAddCallback = this.room.state.players.onAdd((player, key) => {
            this.checkAndCreateScene();
            this.playersOnAdd(player, key, previousScene);
            this.listenPlayerAndStateChanges(player, key);
        });
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

    /**
     * @param {any} player
     * @param {string} key
     */
    listenPlayerAndStateChanges(player, key)
    {
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

    /**
     * @returns {boolean}
     */
    checkAndCreateScene()
    {
        if(!this.room.state){
            Logger.warning('Room state is not ready.');
            return false;
        }
        if(0 === Object.keys(this.roomData).length){
            this.roomData = sc.toJson(this.room.state.sceneData);
        }
        if(this.gameEngine.scene.getScene(this.roomName)){
            return false;
        }
        let engineSceneDynamic = this.createSceneInstance(this.roomName, this.roomData, this.gameManager);
        this.gameEngine.scene.add(this.roomName, engineSceneDynamic, false);
        return true;
    }

    /**
     * @param {any} player
     * @param {string} key
     * @param {string|boolean} previousScene
     * @returns {Promise<void>}
     */
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

    /**
     * @param {string} key
     * @returns {boolean}
     */
    isCurrentPlayer(key)
    {
        return key === this.room.sessionId;
    }

    /**
     * @param {any} player
     * @param {string} key
     * @param {any} addPlayerData
     * @returns {boolean}
     */
    addOtherPlayers(player, key, addPlayerData)
    {
        if(!this.engineStarted){
            this.playersQueue[key] = addPlayerData;
            return false;
        }
        let currentScene = this.getActiveScene();
        if(!this.isValidScene(currentScene, player)){
            return false;
        }
        currentScene.player.addPlayer(key, addPlayerData);
        return true;
    }

    /**
     * @param {any} player
     * @param {string|boolean} previousScene
     * @param {string} key
     * @returns {Promise<{player: any, key: string, previousScene: (string|boolean), roomEvents: RoomEvents}>}
     */
    async createCurrentPlayer(player, previousScene, key)
    {
        this.engineStarted = true;
        await this.startEngineScene(player, this.room, previousScene);
        let currentScene = this.getActiveScene();
        if(!this.isValidScene(currentScene, player)){
            return;
        }
        await this.events.emit('reldens.playersQueueBefore', player, key, previousScene, this);
        for(let i of Object.keys(this.playersQueue)){
            currentScene.player.addPlayer(i, this.playersQueue[i]);
        }
        let eventData = {player, key, previousScene, roomEvents: this};
        await this.events.emit('reldens.createCurrentPlayer', eventData);
        return eventData;
    }

    /**
     * @param {SceneDynamic} currentScene
     * @param {any} player
     * @returns {boolean}
     */
    isValidScene(currentScene, player)
    {
        return currentScene.key === player.state.scene && currentScene.player && currentScene.player.players;
    }

    /**
     * @param {any} player
     * @param {string} key
     * @param {string} from
     */
    playersOnChange(player, key, from)
    {
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
            return;
        }
        currentScene.player.updatePlayer(key, player);
    }

    /**
     * @param {any} player
     * @param {string} key
     */
    playersOnRemove(player, key)
    {
        this.events.emitSync('reldens.playersOnRemove', player, key, this);
        if(key === this.room.sessionId){
            return this.gameOverReload();
        }
        return this.removePlayerByKey(key);
    }

    /**
     * @param {string} key
     */
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
        let defaultReload = {confirmed: true};
        this.events.emitSync('reldens.gameOverReload', this, defaultReload);
        if(!this.gameManager.gameOver && defaultReload.confirmed){
            this.gameDom.alertReload(this.gameManager.services.translator.t('game.errors.sessionEnded'));
        }
    }

    /**
     * @param {SceneDynamic} currentScene
     * @param {string} key
     * @returns {boolean}
     */
    playerExists(currentScene, key)
    {
        return currentScene.player && sc.hasOwn(currentScene.player.players, key);
    }

    /**
     * @param {any} message
     * @returns {Promise<void>}
     */
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

    /**
     * @param {any} message
     * @returns {Promise<boolean>}
     */
    async runInitUi(message)
    {
        if(message.act !== GameConst.UI || !message.id){
            return false;
        }
        await this.events.emit('reldens.initUiBefore', message, this);
        this.initUi(message);
        await this.events.emit('reldens.initUiAfter', message, this);
        return true;
    }

    /**
     * @param {any} message
     * @returns {Promise<boolean>}
     */
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

    /**
     * @param {any} message
     * @returns {Promise<boolean>}
     */
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
        if(!sc.isFunction(listener['executeClientMessageActions'])){
            Logger.error('Listener is missing "executeClientMessageActions" method.', listener);
            return false;
        }
        listener['executeClientMessageActions']({message, roomEvents: this});
        return true;
    }

    /**
     * @param {any} message
     * @returns {Promise<boolean>}
     */
    async runUpdateStats(message)
    {
        if(message.act !== GameConst.PLAYER_STATS){
            return false;
        }
        await this.events.emit('reldens.playerStatsUpdateBefore', message, this);
        return await this.updatePlayerStats(message);
    }

    /**
     * @param {any} message
     * @returns {Promise<void>}
     */
    async runReconnect(message)
    {
        if(message.act !== GameConst.RECONNECT){
            return;
        }
        await this.events.emit('reldens.beforeReconnectGameClient', message, this);
        await this.gameManager.reconnectGameClient(message, this.room);
    }

    /**
     * @param {any} message
     */
    async runChangingScene(message)
    {
        if(message.act !== GameConst.CHANGING_SCENE || this.room.sessionId !== message.id){
            return;
        }
        this.gameManager.setChangingScene(true);
        this.closeAllActiveDialogs();
        this.gameManager.getActiveScene().scene.setVisible(false);
    }

    /**
     * @param {any} message
     * @returns {Promise<void>}
     */
    async runChangedScene(message)
    {
        if(
            message.act !== GameConst.CHANGED_SCENE
            || message.scene !== this.room.name
            || this.room.sessionId === message.id
        ){
            return;
        }
        await this.events.emit('reldens.startChangedScene', {message, roomEvents: this});
        let currentScene = this.getActiveScene();
        let {id, x, y, dir, playerName, playedTime, avatarKey, player_id} = message;
        let topOff = this.gameManager.config.get('client/players/size/topOffset');
        let leftOff = this.gameManager.config.get('client/players/size/leftOffset');
        let addPlayerData = {x: (x - leftOff), y: (y - topOff), dir, playerName, playedTime, avatarKey, player_id};
        currentScene.player.addPlayer(id, addPlayerData);
        this.gameManager.setChangingScene(false);
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

    /**
     * @param {any} message
     * @returns {Promise<void>}
     */
    async runRevived(message)
    {
        if(message.act !== GameConst.REVIVED){
            return;
        }
        this.gameDom.getElement('#game-over').classList.add('hidden');
        let currentPlayer = this.gameManager.getCurrentPlayer();
        let showSprite = sc.get(currentPlayer.players, message.t, false);
        if(!showSprite){
            return;
        }
        showSprite.visible = true;
        if(sc.hasOwn(showSprite, 'nameSprite') && showSprite.nameSprite){
            showSprite.nameSprite.visible = true;
        }
        this.getActiveScene().stopOnDeathOrDisabledSent = false;
    }

    /**
     * @param {any} message
     * @returns {Promise<boolean>}
     */
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

    /**
     * @returns {boolean}
     */
    showGameOverBox()
    {
        return this.displayGameOverBox(true);
    }

    /**
     * @returns {boolean}
     */
    hideGameOverBox()
    {
        return this.displayGameOverBox(false);
    }

    /**
     * @param {boolean} display
     * @returns {boolean}
     */
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

    /**
     * @param {number} code
     */
    async roomOnLeave(code)
    {
        if(this.isAbnormalShutdown(code) && !this.gameManager.gameOver && !this.gameManager.forcedDisconnection){
            Logger.error('There was a connection error.', {
                code,
                isGameOver: this.gameManager.gameOver,
                isForcedDisconnection: this.gameManager.forcedDisconnection
            });
            this.gameDom.alertReload(this.gameManager.services.translator.t('game.errors.serverDown'));
        }
        await this.events.emit('reldens.playerLeftScene', {code, roomEvents: this});
    }

    /**
     * @param {number} code
     * @returns {boolean}
     */
    isAbnormalShutdown(code)
    {
        return 1001 <= code && 1015 >= code;
    }

    /**
     * @param {any} message
     * @returns {Promise<boolean>}
     */
    async updatePlayerStats(message)
    {
        if(!sc.hasOwn(message, 'stats') || !message.stats){
            return false;
        }
        let currentScene = this.getActiveScene();
        if(!currentScene.player || !sc.hasOwn(currentScene.player.players, this.room.sessionId)){
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
        return true;
    }

    /**
     * @param {any} props
     */
    initUi(props)
    {
        let uiScene = this.gameEngine.uiScene;
        if(!uiScene || !sc.hasOwn(uiScene.elementsUi, props.id)){
            Logger.error('User interface not found on UI Scene: '+props.id);
            return;
        }
        let uiBox = uiScene.elementsUi[props.id];
        this.uiSetTitle(uiBox, props);
        this.uiSetContent(uiBox, props, uiScene);
        let dialogContainer = uiBox.getChildByID('box-'+props.id);
        let shouldSetDisplayNone = props.keepCurrentDisplay && 'none' === dialogContainer.style.display;
        dialogContainer.style.display = shouldSetDisplayNone ? 'none' : 'block';
        uiBox.setDepth(2);
        if(this.gameManager.config.get('client/ui/uiTarget/hideOnDialog')){
            this.gameEngine.clearTarget();
        }
    }

    /**
     * @param {any} uiBox
     * @param {any} props
     * @param {any} uiScene
     */
    uiSetTitleAndContent(uiBox, props, uiScene)
    {
        this.uiSetTitle(uiBox, props);
        this.uiSetContent(uiBox, props, uiScene);
    }

    /**
     * @param {any} uiBox
     * @param {any} props
     * @returns {boolean}
     */
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
        return true;
    }

    /**
     * @param {any} uiBox
     * @param {any} props
     * @param {any} uiScene
     */
    uiSetContent(uiBox, props, uiScene)
    {
        let newContent = sc.get(props, 'content', false);
        if(false === newContent){
            return;
        }
        let boxContent = uiBox.getChildByProperty('className', 'box-content');
        if(!boxContent){
            return;
        }
        boxContent.innerHTML = newContent;
        this.uiSetContentOptions(uiScene, props, boxContent);
    }

    /**
     * @param {any} uiScene
     * @param {any} props
     * @param {any} boxContent
     * @returns {boolean}
     */
    uiSetContentOptions(uiScene, props, boxContent)
    {
        if(!props.options){
            return false;
        }
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
        return true;
    }

    /**
     * @param {any} player
     * @param {Room} room
     * @param {string|boolean} [previousScene]
     * @returns {Promise<void>}
     */
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

    /**
     * @param {string} preloaderName
     * @param {any} player
     * @param {Room} room
     * @param {string|boolean} previousScene
     * @returns {Promise<void>}
     */
    async createEngineOnScene(preloaderName, player, room, previousScene)
    {
        let currentScene = this.getActiveScene();
        currentScene.objectsAnimationsData = this.roomData.objectsAnimationsData;
        this.scenePreloader = this.gameEngine.scene.getScene(preloaderName);
        await this.events.emit('reldens.createdPreloaderRecurring', this, this.scenePreloader);
        await this.createEngineScene(player, room, previousScene);
    }

    /**
     * @param {string} preloaderName
     * @param {boolean} uiScene
     * @param {any} player
     * @param {Room} room
     * @param {string|boolean} previousScene
     * @returns {Promise<void>}
     */
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
            if(!this.gameEngine.uiScene){
                this.gameEngine.uiScene = preloader;
                this.showPlayerName(this.gameManager.playerData.id + ' - ' + this.gameManager.playerData.name);
            }
            await this.createEngineScene(player, room, previousScene);
        });
    }

    /**
     * @param {string} playerName
     * @returns {boolean}
     */
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
        return true;
    }

    /**
     * @param {any} player
     * @param {Room} room
     * @param {string|boolean} previousScene
     * @returns {Promise<{currentScene: Scene|any, previousScene: (string|boolean), roomEvents: RoomEvents}>}
     */
    async createEngineScene(player, room, previousScene)
    {
        let previousSceneInstance = this.gameEngine.scene.getScene(previousScene);
        if(previousSceneInstance){
            previousSceneInstance.scene.setVisible(false);
        }
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
        this.send({act: GameConst.PLAYER_STATS});
        this.send({act: GameConst.CLIENT_JOINED});
        let playerAddEventData = { player: currentScene.player, previousScene, roomEvents: this};
        await this.events.emit('reldens.playersOnAddReady', playerAddEventData);
        let eventData = {currentScene, previousScene, roomEvents: this};
        await this.events.emit('reldens.createEngineSceneDone', eventData);
        return eventData;
    }

    /**
     * @param {Room} room
     * @param {SceneDynamic} currentScene
     * @returns {boolean}
     */
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
        return true;
    }

    /**
     * @param {Room} room
     * @param {string} i
     * @returns {any}
     */
    playerBySessionIdFromState(room, i)
    {
        return room.state.players.get(i);
    }

    /**
     * @param {Room} room
     * @returns {number}
     */
    playersCountFromState(room)
    {
        return room.state.players.size;
    }

    /**
     * @param {Room} room
     * @returns {string[]}
     */
    playersKeysFromState(room)
    {
        return Array.from(room.state.players.keys());
    }

    /**
     * @param {string|boolean} previousScene
     * @returns {Promise<boolean>}
     */
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
        return true;
    }

    /**
     * @param {string} newLabel
     * @returns {boolean}
     */
    updateSceneLabel(newLabel)
    {
        let sceneLabel = this.gameManager.getUiElement('sceneLabel');
        if(!sceneLabel){
            return false;
        }
        let element = sceneLabel.getChildByProperty('className', 'scene-label');
        if(!element){
            return false;
        }
        element.innerHTML = newLabel;
        return true;
    }

    /**
     * @returns {SceneDynamic}
     */
    getActiveScene()
    {
        return this.gameEngine.scene.getScene(this.roomName);
    }

    /**
     * @param {string} sceneName
     * @param {any} sceneData
     * @param {GameManager} gameManager
     * @returns {SceneDynamic}
     */
    createSceneInstance(sceneName, sceneData, gameManager)
    {
        return new SceneDynamic(sceneName, sceneData, gameManager);
    }

    /**
     * @param {SceneDynamic} currentScene
     * @param {any} player
     * @param {GameManager} gameManager
     * @param {Room} room
     * @returns {PlayerEngine}
     */
    createPlayerEngineInstance(currentScene, player, gameManager, room)
    {
        return new PlayerEngine({scene: currentScene, playerData: player, gameManager, room, roomEvents: this});
    }

    /**
     * @param {any} props
     * @returns {ScenePreloader}
     */
    createPreloaderInstance(props)
    {
        return new ScenePreloader(props);
    }

    /**
     * @param {any} data
     * @param {string} [key]
     * @returns {boolean}
     */
    send(data, key)
    {
        try {
            if(this.room.connection.transport.ws.readyState === this.room.connection.transport.ws.CLOSED){
                ErrorManager.error('Connection lost.');
            }
            if(this.room.connection.transport.ws.readyState === this.room.connection.transport.ws.CLOSING){
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
        return false;
    }

}

module.exports.RoomEvents = RoomEvents;
