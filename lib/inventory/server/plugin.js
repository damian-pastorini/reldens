/**
 *
 * Reldens - Inventory Server Plugin
 *
 * Server-side plugin for the inventory system.
 * Manages inventory initialization, player death item drops, and message actions.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { InventoryMessageActions } = require('./message-actions');
const { PlayerSubscriber } = require('./subscribers/player-subscriber');
const { PlayerDeathSubscriber } = require('./subscribers/player-death-subscriber');
const { ServerSubscriber } = require('./subscribers/server-subscriber');
const { ModelsManager } = require('./models-manager');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('./models-manager').ModelsManager} ModelsManager
 * @typedef {import('./subscribers/player-death-subscriber').PlayerDeathSubscriber} PlayerDeathSubscriber
 */
class InventoryPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     * @returns {Promise<void>}
     */
    async setup(props)
    {
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in InventoryPlugin.');
        }
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            this.modelsManager = new ModelsManager({dataServer: event.serverManager.dataServer});
            this.playerDeathSubscriber = new PlayerDeathSubscriber(this.modelsManager);
        });
        this.events.on('reldens.serverReady', async (event) => {
            await ServerSubscriber.initializeInventory(event.serverManager.configManager, this.modelsManager);
        });
        this.events.on('reldens.createPlayerStatsAfter', async (client, userModel, currentPlayer, room) => {
            await PlayerSubscriber.createPlayerInventory(client, currentPlayer, room, this.events, this.modelsManager);
        });
        // when the client sent a message to any room, it will be checked by all the global messages defined:
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.inventory = new InventoryMessageActions();
        });
        this.events.on('reldens.playerDeath', async (event) => {
            try {
                await this.playerDeathSubscriber.dropPlayerItems(
                    event.targetClient,
                    event.targetSchema,
                    event.room,
                    this.events,
                    this.modelsManager
                );
            } catch (error) {
                Logger.error('Error while dropping player items.', error);
            }
        });
        this.events.on('reldens.beforeSuperInitialGameData', (superInitialGameData) => {
            if(!this.config){
                return;
            }
            superInitialGameData.availableItems = Object.keys(sc.get(this.config.inventory, 'items', {})).length;
            superInitialGameData.equipmentGroups = sc.get(this.config.inventory.groups, 'groupModels', []).length;
        });
    }

}

module.exports.InventoryPlugin = InventoryPlugin;
