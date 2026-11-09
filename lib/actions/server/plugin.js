/**
 *
 * Reldens - ActionsPlugin
 *
 * Plugin that integrates the actions/skills system into the game server.
 *
 */

const { ActionsMessageActions } = require('./message-actions');
const { PluginInterface } = require('../../features/plugin-interface');
const { InitialGameDataEnricher } = require('./initial-game-data-enricher');
const { PlayerEnricher } = require('./player-enricher');
const { DataLoader } = require('./data-loader');
const { EventListeners } = require('./event-listeners');
const { PlayerClassPathHandler } = require('./player-class-path-handler');
const { ModelsManager } = require('./models-manager');
const { RoomAutoRecovery } = require('./room-auto-recovery');
const { PlayerDeathRelocator } = require('./player-death-relocator');
const { ResurrectionAdGate } = require('./resurrection-ad-gate');
const { DeathReviveNotifier } = require('./death-revive-notifier');
const { DeathReviveRequests } = require('./death-revive-requests');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../users/server/player').Player} Player
 * @typedef {import('../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class ActionsPlugin extends PluginInterface
{

    constructor()
    {
        super();
        /** @type {EventsManager|boolean} */
        this.events = false;
        /** @type {BaseDataServer|boolean} */
        this.dataServer = false;
        /** @type {ConfigManager|boolean} */
        this.config = false;
        /** @type {PlayerDeathRelocator|boolean} */
        this.playerDeathRelocator = false;
        /** @type {ResurrectionAdGate|boolean} */
        this.resurrectionAdGate = false;
        /** @type {DeathReviveNotifier|boolean} */
        this.deathReviveNotifier = false;
        /** @type {DeathReviveRequests|boolean} */
        this.deathReviveRequests = false;
    }

    /**
     * @param {Object} props
     */
    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('Data Server undefined in ActionsPlugin.');
        }
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in ActionsPlugin.');
        }
        this.skillsModelsManager = new ModelsManager({events: this.events, dataServer: this.dataServer});
        this.playerEnricher = new PlayerEnricher({
            events: this.events,
            config: this.config,
            skillsModelsManager: this.skillsModelsManager
        });
        this.initialGameDataEnricher = new InitialGameDataEnricher();
        this.roomAutoRecovery = new RoomAutoRecovery({events: this.events});
        this.playerDeathRelocator = new PlayerDeathRelocator({config: this.config, events: this.events});
        this.resurrectionAdGate = new ResurrectionAdGate({config: this.config});
        this.deathReviveNotifier = new DeathReviveNotifier({
            config: this.config,
            playerDeathRelocator: this.playerDeathRelocator
        });
        this.deathReviveRequests = new DeathReviveRequests({
            playerDeathRelocator: this.playerDeathRelocator,
            deathReviveNotifier: this.deathReviveNotifier
        });
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.serverReady', this.serverReadyDataLoaderEnrichConfig.bind(this));
        this.events.on('reldens.beforeSuperInitialGameData', this.enrichInitialGameDataWithClassPathData.bind(this));
        this.events.on('reldens.roomsMessageActionsByRoom', this.appendRoomActions.bind(this));
        this.events.on('reldens.createdPlayerSchema', this.enrichPlayerWithSkillsAndActions.bind(this));
        this.events.on('reldens.createdNewPlayer', this.createPlayerClassPath.bind(this));
        this.events.on('reldens.sceneRoomOnCreate', (room) => {
            this.roomAutoRecovery.startRoomTicks(room);
        });
        this.events.on('reldens.onRoomDispose', (event) => {
            this.roomAutoRecovery.stopRoomTicks(event.roomId);
        });
        this.listenDeathEvents();
    }

    /**
     * @returns {boolean|void}
     */
    listenDeathEvents()
    {
        if(!this.config){
            return false;
        }
        this.events.on('reldens.serverReady', async (event) => {
            await this.playerDeathRelocator.loadTownRoom(event.serverManager.roomsManager);
        });
        this.events.on('reldens.playerDeath', (event) => {
            this.playerDeathRelocator.onPlayerDeath(event);
            this.deathReviveNotifier.notifyClient(event.targetClient, event.targetSchema);
        });
        this.events.on('reldens.playerReviveReady', (event) => {
            this.deathReviveNotifier.notifyClient(event.targetClient, event.targetSchema);
        });
        this.events.on('reldens.afterGiveAdRewardItem', (event) => {
            this.deathReviveNotifier.onAfterGiveAdRewardItem(event);
        });
        this.events.on('reldens.afterAdStarted', (event) => {
            this.resurrectionAdGate.onAfterAdStarted(event);
        });
        this.events.on('reldens.afterAdEnded', (event) => {
            this.resurrectionAdGate.onAfterAdEnded(event);
        });
        this.events.on('reldens.beforeSceneExecuteMessages', async (event) => {
            this.resurrectionAdGate.onBeforeSceneExecuteMessages(event);
            await this.deathReviveRequests.onBeforeSceneExecuteMessages(event);
        });
    }

    /**
     * @param {Object} event
     * @returns {Promise<void>}
     */
    async serverReadyDataLoaderEnrichConfig(event)
    {
        await DataLoader.enrichConfig(event.serverManager.configManager, this.skillsModelsManager, this.dataServer);
    }

    /**
     * @param {Object} superInitialGameData
     * @param {RoomScene} roomGame
     * @returns {Promise<void>}
     */
    async enrichInitialGameDataWithClassPathData(superInitialGameData, roomGame)
    {
        await this.initialGameDataEnricher.withClassPathLabels(roomGame, superInitialGameData);
        await this.playerEnricher.withClassPath(roomGame, superInitialGameData);
    }

    /**
     * @param {RoomScene} roomMessageActions
     * @returns {Promise<void>}
     */
    async appendRoomActions(roomMessageActions)
    {
        roomMessageActions.actions = new ActionsMessageActions();
    }

    /**
     * @param {Object} client
     * @param {Object} userModel
     * @param {Player} currentPlayer
     * @param {RoomScene} room
     * @returns {Promise<void>}
     */
    async enrichPlayerWithSkillsAndActions(client, userModel, currentPlayer, room)
    {
        await this.playerEnricher.withActions(currentPlayer, room, this.events);
        // @TODO - BETA - Improve login performance.
        await this.playerEnricher.withSkillsServerAndClassPath({
            client,
            room,
            skillsModelsManager: this.skillsModelsManager,
            currentPlayer,
            dataServer: this.dataServer,
            events: this.events
        });
        await EventListeners.attachCastMovementEvents({
            classPath: currentPlayer.skillsServer.classPath,
            events: this.events,
            actionsPlugin: this
        });
    }

    /**
     * @param {Player} player
     * @param {Object} loginData
     * @returns {Promise<any>}
     */
    async createPlayerClassPath(player, loginData)
    {
        return PlayerClassPathHandler.createFromLoginData({
            config: this.config,
            loginData,
            player,
            dataServer: this.dataServer
        });
    }

}

module.exports.ActionsPlugin = ActionsPlugin;
