/**
 *
 * Reldens - CrazyGames
 *
 * SDK documentation: https://docs.crazygames.com/sdk/html5-v2/#request-banner
 *
 * Integrates the CrazyGames advertising SDK for banner and video ads. The video ads events are listened on the provider
 * activation, before the SDK loads (the SDK script is retried until it loads), so an ad event fired while the SDK loads
 * (like the activation of the first room on the login) is queued and played once the SDK is ready; the banners are
 * activated once the SDK is ready and no adblock is detected.
 *
 */

const { BannersHandler } = require('./crazy-games/banners-handler');
const { VideosHandler } = require('./crazy-games/videos-handler');
const { AdsProvider } = require('../ads-provider');
const { AdsConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('./crazy-games/banners-handler').BannersHandler} BannersHandler
 * @typedef {import('./crazy-games/videos-handler').VideosHandler} VideosHandler
 */
class CrazyGames
{

    /**
     * @param {Object} providerModel
     * @param {GameManager} gameManager
     */
    constructor(providerModel, gameManager)
    {
        /** @type {GameManager} */
        this.gameManager = gameManager;
        /** @type {Object} */
        this.gameDom = gameManager?.gameDom;
        /** @type {Object} */
        this.events = gameManager?.events;
        /** @type {Window} */
        this.window = gameManager?.gameDom?.getWindow();
        /** @type {Object} */
        this.metaData = providerModel;
        /** @type {Object} */
        this.sdk = this.window?.CrazyGames?.SDK;
        /** @type {number} */
        this.retry = 0;
        /** @type {string} */
        this.environment = AdsConst.ENVIRONMENTS.DISABLED;
        if(!this.metaData.sdkRetryTime){
            this.metaData.sdkRetryTime = 500;
        }
        if(!this.metaData.sdkMaxRetries){
            this.metaData.sdkMaxRetries = 10;
        }
        if(!this.metaData.sdkBannerRefreshTime){
            this.metaData.sdkBannerRefreshTime = 60000;
        }
        /** @type {Object<string, Object>} */
        this.activeAds = this.fetchActiveAds(providerModel);
        let handlersProps = {
            gameManager,
            metaData: providerModel,
            sdk: this.sdk,
            hasAdblock: this.hasAdblock,
            isEnabled: this.isEnabled
        };
        /** @type {BannersHandler} */
        this.bannersHandler = new BannersHandler(handlersProps);
        /** @type {VideosHandler} */
        this.videosHandler = new VideosHandler(handlersProps);
    }

    /**
     * @param {Object} providerModel
     * @returns {Object<string, Object>}
     */
    fetchActiveAds(providerModel)
    {
        if(!this.gameManager?.config){
            return {};
        }
        return AdsProvider.fetchActiveAdsByProviderId(
            providerModel.id,
            this.validAdsTypes(),
            this.gameManager.config.get('client/ads/collection', {})
        );
    }

    /**
     * @returns {Array<string>}
     */
    validAdsTypes()
    {
        return [AdsConst.ADS_TYPES.BANNER, AdsConst.ADS_TYPES.EVENT_VIDEO];
    }

    /**
     * @returns {Promise<boolean>}
     */
    async activate()
    {
        await this.activateAdsOfType(
            AdsConst.ADS_TYPES.EVENT_VIDEO,
            async (activeAd) => await this.videosHandler.activateAdVideo(activeAd)
        );
        return await this.activateSdk();
    }

    /**
     * @returns {Promise<boolean>}
     */
    async activateSdk()
    {
        if(!this.sdk){
            if(this.retry === this.metaData.sdkMaxRetries){
                Logger.critical('CrazyGames required object.');
                return false;
            }
            if(this.retry < this.metaData.sdkMaxRetries){
                setTimeout(() => {
                    this.retry++;
                    Logger.info('CrazyGames required object, retry #'+this.retry+'.');
                    this.sdk = this.window?.CrazyGames?.SDK;
                    if(this.sdk){
                        Logger.info('CrazyGames object found.');
                    }
                    this.activateSdk();
                }, this.metaData.sdkRetryTime);
            }
            return false;
        }
        this.environment = await this.sdk.getEnvironment();
        this.bannersHandler.sdk = this.sdk;
        this.videosHandler.sdk = this.sdk;
        if(await this.hasAdblock()){
            return false;
        }
        await this.activateAdsOfType(
            AdsConst.ADS_TYPES.BANNER,
            async (activeAd) => await this.bannersHandler.activateAdBanner(activeAd)
        );
        return await this.videosHandler.playQueuedAds();
    }

    /**
     * @returns {Promise<boolean>}
     */
    async hasAdblock()
    {
        try {
            let result = await this.sdk.ad.hasAdblock();
            if(result){
                Logger.critical('Adblock detected, please disable.');
            }
            return result;
        } catch (error) {
            Logger.info('SDK detected error.', error);
        }
        return false;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async isEnabled()
    {
        return AdsConst.ENVIRONMENTS.DISABLED !== await this.sdk.getEnvironment();
    }

    /**
     * @param {string} adsTypeKey
     * @param {Function} adActivation
     * @returns {Promise<boolean>}
     */
    async activateAdsOfType(adsTypeKey, adActivation)
    {
        for(let i of Object.keys(this.activeAds)){
            if(adsTypeKey === this.activeAds[i].type.key){
                await adActivation(this.activeAds[i]);
            }
        }
        return true;
    }

}

module.exports.CrazyGames = CrazyGames;
