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
const { ItemsGrowthApplier } = require('./items-growth-applier');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('./models-manager').ModelsManager} ModelsManager
 * @typedef {import('./subscribers/player-death-subscriber').PlayerDeathSubscriber} PlayerDeathSubscriber
 */
class InventoryPlugin extends PluginInterface
{

    constructor()
    {
        super();
        /** @type {ConfigManager|boolean} */
        this.config = false;
        /** @type {EventsManager|boolean} */
        this.events = false;
        /** @type {BaseDataServer|boolean} */
        this.dataServer = false;
        /** @type {ItemsGrowthApplier|boolean} */
        this.itemsGrowthApplier = false;
        /** @type {ModelsManager|boolean} */
        this.modelsManager = false;
        /** @type {PlayerDeathSubscriber|boolean} */
        this.playerDeathSubscriber = false;
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        return this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.config){
            Logger.error('Config undefined in InventoryPlugin.');
            return false;
        }
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
            return false;
        }
        if(!this.dataServer){
            Logger.error('DataServer undefined in InventoryPlugin.');
            return false;
        }
        /** @type {ItemsGrowthApplier} */
        this.itemsGrowthApplier = new ItemsGrowthApplier({dataServer: this.dataServer});
        /** @type {ModelsManager} */
        this.modelsManager = new ModelsManager({dataServer: this.dataServer});
        /** @type {PlayerDeathSubscriber} */
        this.playerDeathSubscriber = new PlayerDeathSubscriber(
            this.modelsManager,
            this.config.getWithoutLogs('server/players/drop/equippedItems', true)
        );
        this.events.on('reldens.serverReady', async () => {
            await ServerSubscriber.initializeInventory(this.config, this.modelsManager);
        });
        this.events.on('reldens.createPlayerStatsAfter', async (client, userModel, currentPlayer, room) => {
            await PlayerSubscriber.createPlayerInventory(client, currentPlayer, room, this.events, this.modelsManager);
        });
        this.events.on('reldens.createPlayerInventoryAfter', async (event) => {
            await this.itemsGrowthApplier.onCreatePlayerInventoryAfter(event);
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
            superInitialGameData.availableItems = Object.keys(sc.get(this.config.inventory, 'items', {})).length;
            superInitialGameData.equipmentGroups = sc.get(this.config.inventory.groups, 'groupModels', []).length;
        });
        return true;
    }

}

module.exports.InventoryPlugin = InventoryPlugin;
