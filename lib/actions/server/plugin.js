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
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../users/server/player').Player} Player
 * @typedef {import('../../rooms/server/scene').RoomScene} RoomScene
 */
class ActionsPlugin extends PluginInterface
{

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
     * @param {Object} loginManager
     * @returns {Promise<any>}
     */
    async createPlayerClassPath(player, loginData, loginManager)
    {
        return PlayerClassPathHandler.createFromLoginData({
            loginManager,
            loginData,
            player,
            dataServer: this.dataServer
        });
    }

}

module.exports.ActionsPlugin = ActionsPlugin;
