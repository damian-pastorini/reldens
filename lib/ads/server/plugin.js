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

    constructor()
    {
        super();
        /** @type {EventsManager|false} */
        this.events = false;
        /** @type {BaseDataServer|false} */
        this.dataServer = false;
        /** @type {AdsStartHandler|false} */
        this.adsStartHandler = false;
        /** @type {CreatePlayerAdsHandler|false} */
        this.createPlayerAdsHandler = false;
    }

    /**
     * @param {AdsPluginProps} props
     * @returns {boolean}
     */
    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.validateProperties()){
            return false;
        }
        this.adsStartHandler = new AdsStartHandler();
        this.createPlayerAdsHandler = new CreatePlayerAdsHandler(this);
        this.listenEvents();
        return true;
    }

    /**
     * @returns {boolean}
     */
    validateProperties()
    {
        if(!this.events){
            Logger.error('Missing EventsManager in AdsPlugin.');
            return false;
        }
        if(!this.dataServer){
            Logger.error('Missing DataServer in AdsPlugin.');
            return false;
        }
        return true;
    }

    listenEvents()
    {
        this.events.on('reldens.serverConfigFeaturesReady', async (props) => {
            await this.adsStartHandler.initialize({
                events: this.events,
                dataServer: this.dataServer,
                configProcessor: props.configProcessor
            });
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.ads = new AdsMessageActions({
                adsPlayedRepository: this.dataServer.getEntity('adsPlayed')
            });
        });
        this.events.on('reldens.createPlayerAfter', async (client, userModel, playerSchema) => {
            await this.createPlayerAdsHandler.enrichPlayedWithPlayedAds(playerSchema, client);
        });
    }
}

module.exports.AdsPlugin = AdsPlugin;
