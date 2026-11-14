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
const { RequiredSdkReachabilityCheck } = require('./required-sdk-reachability-check');
const { AdsConst } = require('../constants');
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
 * @property {Object} [config] - The config manager instance
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
        /** @type {Object|false} */
        this.config = false;
        /** @type {AdsStartHandler|false} */
        this.adsStartHandler = false;
        /** @type {CreatePlayerAdsHandler|false} */
        this.createPlayerAdsHandler = false;
    }

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
        /** @type {Object|false} */
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Missing config in AdsPlugin.');
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
        if(!this.events || !this.dataServer || !this.config){
            return false;
        }
        this.events.on('reldens.serverConfigFeaturesReady', async (props) => {
            await this.adsStartHandler.initialize({
                events: this.events,
                dataServer: this.dataServer,
                configProcessor: props.configProcessor
            });
            if(!this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.SDK_REQUIRED, false)){
                return;
            }
            let reachabilityCheck = new RequiredSdkReachabilityCheck({
                timeoutMs: this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.SDK_CHECK_TIMEOUT, AdsConst.SDK_CHECK_TIMEOUT),
                serverUrls: [
                    this.config.getWithoutLogs('server/publicUrl', ''),
                    this.config.getWithoutLogs('server/baseUrl', '')
                ]
            });
            if(!await reachabilityCheck.areProvidersSdkReachable(
                this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.PROVIDERS, {})
            )){
                props.continueProcess = false;
            }
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.ads = new AdsMessageActions({
                dataServer: this.dataServer,
                adsPlugin: this,
                config: this.config
            });
        });
        this.events.on('reldens.createPlayerAfter', async (client, userModel, playerSchema) => {
            await this.createPlayerAdsHandler.enrichPlayedWithPlayedAds(playerSchema, client);
        });
    }
}

module.exports.AdsPlugin = AdsPlugin;
