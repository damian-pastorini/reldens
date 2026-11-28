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
const { ResurrectionAdGate } = require('./resurrection-ad-gate');
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
        /** @type {ResurrectionAdGate|false} */
        this.resurrectionAdGate = false;
        /** @type {boolean} */
        this.sdkRequired = false;
        /** @type {number} */
        this.sdkCheckTimeout = AdsConst.SDK_CHECK_TIMEOUT;
        /** @type {Array<string>} */
        this.serverUrls = [];
    }

    /**
     * @param {AdsPluginProps} props
     */
    setup(props)
    {
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        /** @type {BaseDataServer|false} */
        this.dataServer = sc.get(props, 'dataServer', false);
        /** @type {Object|false} */
        this.config = sc.get(props, 'config', false);
        this.loadConfig();
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    loadConfig()
    {
        if(!this.config){
            return false;
        }
        this.sdkRequired = this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.SDK_REQUIRED, false);
        this.sdkCheckTimeout = this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.SDK_CHECK_TIMEOUT, AdsConst.SDK_CHECK_TIMEOUT);
        this.serverUrls = [
            this.config.getWithoutLogs('server/publicUrl', ''),
            this.config.getWithoutLogs('server/baseUrl', '')
        ];
        return true;
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in AdsPlugin.');
            return false;
        }
        if(!this.dataServer){
            Logger.error('DataServer undefined in AdsPlugin.');
            return false;
        }
        if(!this.config){
            Logger.error('Missing config in AdsPlugin.');
            return false;
        }
        /** @type {AdsStartHandler} */
        this.adsStartHandler = new AdsStartHandler();
        /** @type {CreatePlayerAdsHandler} */
        this.createPlayerAdsHandler = new CreatePlayerAdsHandler(this);
        this.events.on('reldens.serverConfigFeaturesReady', async (props) => {
            await this.adsStartHandler.initialize({
                events: this.events,
                dataServer: this.dataServer,
                configProcessor: props.configProcessor
            });
            this.listenResurrectionAdEvents();
            if(!this.sdkRequired){
                return;
            }
            let reachabilityCheck = new RequiredSdkReachabilityCheck({
                timeoutMs: this.sdkCheckTimeout,
                serverUrls: this.serverUrls
            });
            if(!await reachabilityCheck.areProvidersSdkReachable(
                this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.PROVIDERS, {})
            )){
                props.continueProcess = false;
            }
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.ads = new AdsMessageActions({dataServer: this.dataServer, config: this.config});
        });
        this.events.on('reldens.createPlayerAfter', async (client, userModel, playerSchema) => {
            await this.createPlayerAdsHandler.enrichPlayedWithPlayedAds(playerSchema, client);
        });
        return true;
    }

    listenResurrectionAdEvents()
    {
        this.resurrectionAdGate = new ResurrectionAdGate({
            events: this.events,
            adsKey: this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.RESURRECTION_ADS_KEY, ''),
            adsCollection: this.config.getWithoutLogs(AdsConst.CONFIG_PATHS.COLLECTION, {}),
            maximumDuration: this.config.getWithoutLogs(
                AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION,
                AdsConst.VIDEOS_MAXIMUM_DURATION
            )
        });
        this.events.on('reldens.beforeSceneExecuteMessages', (event) => {
            this.resurrectionAdGate.closeRequestOrHoldRevive(event);
        });
        this.events.on('reldens.afterAdStarted', (event) => {
            this.resurrectionAdGate.holdReviveOrCloseFailedStart(event);
        });
        this.events.on('reldens.afterAdEnded', (event) => {
            this.resurrectionAdGate.releaseReviveHold(event);
        });
        this.events.on('reldens.afterGiveAdRewardItem', (event) => {
            this.resurrectionAdGate.chooseRestorationItemUse(event);
        });
        this.events.on('reldens.deathTownReviveData', (event) => {
            this.resurrectionAdGate.appendResurrectionAdOffer(event);
        });
    }
}

module.exports.AdsPlugin = AdsPlugin;
