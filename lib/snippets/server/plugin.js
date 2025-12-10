/**
 *
 * Reldens - SnippetsPlugin
 *
 */

const { InitialGameDataEnricher } = require('./initial-game-data-enricher');
const { ConfigurationEnricher } = require('./configuration-enricher');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 */
class SnippetsPlugin extends PluginInterface
{

    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPlugin.');
        }
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in ChatPlugin.');
        }
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
    }

}

module.exports.SnippetsPlugin = SnippetsPlugin;
