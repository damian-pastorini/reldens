/**
 *
 * Reldens - CrazyGames
 *
 * SDK documentation: https://docs.crazygames.com/sdk/html5-v2/#request-banner
 *
 */

const { BannersHandler } = require('./crazy-games/banners-handler');
const { VideosHandler } = require('./crazy-games/videos-handler');
const { AdsProvider } = require('../ads-provider');
const { AdsConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

class CrazyGames
{

    constructor(providerModel, gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = gameManager?.gameDom;
        this.events = gameManager?.events;
        this.window = gameManager?.gameDom?.getWindow();
        this.metaData = providerModel;
        this.sdk = this.window?.CrazyGames?.SDK;
        this.retry = 0;
        this.environment = AdsConst.ENVIRONMENTS.DISABLED;
        if(!this.metaData.sdkRetryTime){
            this.metaData.sdkRetryTime = 500;
        }
        if(!this.metaData.sdkMaxRetries){
            this.metaData.sdkMaxRetries = 10;
        }
        if(!this.metaData.sdkBannerRefreshTime){
            this.metaData.sdkBannerRefreshTime = 60000; // 60s by documentation
        }
        this.activeAds = this.fetchActiveAds(providerModel);
        let handlersProps = {
            gameManager,
            metaData: providerModel,
            sdk: this.sdk,
            hasAdblock: this.hasAdblock,
            isEnabled: this.isEnabled
        };
        this.bannersHandler = new BannersHandler(handlersProps);
        this.videosHandler = new VideosHandler(handlersProps);
    }

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

    validAdsTypes()
    {
        return [AdsConst.ADS_TYPES.BANNER, AdsConst.ADS_TYPES.EVENT_VIDEO];
    }

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

    async hasAdblock()
    {
        try {
            let result = await this.sdk.ad.hasAdblock();
            if(result){
                Logger.critical('Adblock detected, please disable.');
            }
            return result;
        } catch (e) {
            Logger.info('SDK detected error.', e);
        }
        return false;
    }

    async isEnabled()
    {
        return AdsConst.ENVIRONMENTS.DISABLED !== await this.sdk.getEnvironment();
    }

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
