/**
 *
 * Reldens - Ads Server Plugin
 *
 * Server-side ads plugin that manages ad configuration, player ad tracking, and reward distribution.
 *
 */

const { AdsStartHandler } = require('./ads-start-handler');
const { AdsMessageActions } = require('./message-actions');
const { CreatePlayerAdsHandler } = require('./event-handlers/create-player-ads-handler');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('./ads-start-handler').AdsStartHandler} AdsStartHandler
 * @typedef {import('./event-handlers/create-player-ads-handler').CreatePlayerAdsHandler} CreatePlayerAdsHandler
 *
 * @typedef {Object} AdsPluginProps
 * @property {EventsManager} [events] - The events manager instance
 * @property {BaseDataServer} [dataServer] - The data server instance
 */
class AdsPlugin extends PluginInterface
{

    /**
     * @param {AdsPluginProps} props
     */
    setup(props)
    {
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdsPlugin.');
        }
        /** @type {BaseDataServer|false} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in AdsPlugin.');
        }
        /** @type {AdsStartHandler} */
        this.adsStartHandler = new AdsStartHandler();
        /** @type {CreatePlayerAdsHandler} */
        this.createPlayerAdsHandler = new CreatePlayerAdsHandler(this);
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events || !this.dataServer){
            return false;
        }
        this.events.on('reldens.serverConfigFeaturesReady', async (props) => {
            await this.adsStartHandler.initialize({
                events: this.events,
                dataServer: this.dataServer,
                configProcessor: props.configProcessor
            });
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.ads = new AdsMessageActions({dataServer: this.dataServer, adsPlugin: this});
        });
        this.events.on('reldens.createPlayerAfter', async (client, userModel, playerSchema) => {
            await this.createPlayerAdsHandler.enrichPlayedWithPlayedAds(playerSchema, client);
        });
    }
}

module.exports.AdsPlugin = AdsPlugin;
