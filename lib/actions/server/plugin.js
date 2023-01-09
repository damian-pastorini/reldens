/**
 *
 * Reldens - Actions Server Plugin
 *
 */

const { ModelsManager } = require('@reldens/skills/lib/server/storage/models-manager');
const { Logger, sc } = require('@reldens/utils');
const { ActionsMessageActions } = require('./message-actions');
const { PluginInterface } = require('../../features/plugin-interface');
const { InitialGameDataEnricher } = require('./initial-game-data-enricher');
const { PlayerEnricher } = require('./player-enricher');
const { DataLoader } = require('./data-loader');
const { EventListeners } = require('./event-listeners');
const { PlayerClassPathHandler } = require('./player-class-path-handler');

class ActionsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        this.skillsModelsManager = new ModelsManager({events: this.events, dataServer: this.dataServer});
        this.events.on('reldens.serverReady', async (event) => {
            await DataLoader.enrichConfig(event.serverManager.configManager, this.skillsModelsManager, this.dataServer);
        });
        this.events.on('reldens.beforeSuperInitialGameData', async (superInitialGameData, roomGame) => {
            await InitialGameDataEnricher.withClassPathLabels(roomGame, superInitialGameData);
            await PlayerEnricher.withClassPath(roomGame, superInitialGameData, this.dataServer);
        });
        this.events.on('reldens.roomsMessageActionsByRoom', async (roomMessageActions) => {
            roomMessageActions.actions = new ActionsMessageActions();
        });
        this.events.on('reldens.createdPlayerSchema', async (client, authResult, currentPlayer, room) => {
            await PlayerEnricher.withActions(currentPlayer, room, this.events);
            await PlayerEnricher.withSkillsServerAndClassPath({
                client,
                currentPlayer,
                room,
                skillsModelsManager: this.skillsModelsManager,
                dataServer: this.dataServer,
                events: this.events
            });
            await EventListeners.attachCastMovementEvents({
                classPath: currentPlayer.skillsServer.classPath,
                events: this.events,
                actionsPlugin: this
            });
        });
        this.events.on('reldens.createdNewPlayer', async (player, loginData, loginManager) => {
            return PlayerClassPathHandler.createFromLoginData({
                loginManager,
                loginData,
                player,
                dataServer: this.dataServer
            });
        });
    }

}

module.exports.ActionsPlugin = ActionsPlugin;
