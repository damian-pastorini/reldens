/**
 *
 * Reldens - CrazyGames
 *
 * SDK documentation: https://docs.crazygames.com/sdk/html5-v2/#request-banner
 *
 * Integrates the CrazyGames advertising SDK for banner and video ads.
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
                    this.activate();
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
        await this.activateAds();
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
     * @returns {Promise<boolean>}
     */
    async activateAds()
    {
        let activeKeys = Object.keys(this.activeAds);
        if(0 === activeKeys.length){
            return false;
        }
        for(let i of activeKeys){
            let activeAd = this.activeAds[i];
            if(AdsConst.ADS_TYPES.BANNER === activeAd.type.key){
                await this.bannersHandler.activateAdBanner(activeAd);
            }
            if(AdsConst.ADS_TYPES.EVENT_VIDEO === activeAd.type.key){
                await this.videosHandler.activateAdVideo(activeAd);
            }
        }
    }

}

module.exports.CrazyGames = CrazyGames;
