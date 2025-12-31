/**
 *
 * Reldens - SnippetsPlugin
 *
 * Initializes the server-side snippets system with database-driven locale and snippet loading.
 *
 */

const { InitialGameDataEnricher } = require('./initial-game-data-enricher');
const { ConfigurationEnricher } = require('./configuration-enricher');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('./configuration-enricher').ConfigurationEnricher} ConfigurationEnricher
 *
 * @typedef {Object} SnippetsPluginProps
 * @property {EventsManager} events
 * @property {BaseDataServer} dataServer
 */
class SnippetsPlugin extends PluginInterface
{

    /**
     * @param {SnippetsPluginProps} props
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPlugin.');
            return false;
        }
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in ChatPlugin.');
            return false;
        }
        /** @type {ConfigurationEnricher} */
        this.configurationEnricher = new ConfigurationEnricher({
            localeRepository: this.dataServer.getEntity('locale'),
            snippetRepository: this.dataServer.getEntity('snippets'),
        });
        this.events.on('reldens.serverBeforeListen', async (event) => {
            await this.configurationEnricher.withLocalesAndSnippets(event);
        });
        this.events.on(
            'reldens.beforeSuperInitialGameData',
            async (superInitialGameData, roomGame, client, userModel) => {
                await InitialGameDataEnricher.withLocale(superInitialGameData, roomGame, client, userModel);
            }
        );
        return true;
    }

}

module.exports.SnippetsPlugin = SnippetsPlugin;
