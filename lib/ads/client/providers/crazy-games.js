/**
 *
 * Reldens - CrazyGames
 *
 */

const { BannersHandler } = require('./crazy-games/banners-handler');
const { VideosHandler } = require('./crazy-games/videos-handler');
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
        this.sdk = window?.CrazyGames?.SDK;
        this.metaData = providerModel;
        this.retry = 0;
        this.environment = AdsConst.ENVIRONMENTS.DISABLED;
        if(!this.metaData.sdkRetryTime){
            this.metaData.sdkRetryTime = 500;
        }
        if(!this.metaData.sdkMaxRetries){
            this.metaData.sdkMaxRetries = 10;
        }
        this.activeAds = this.findProviderActiveAds();
        this.bannersHandler = new BannersHandler({gameManager, sdk: this.sdk, hasAdblock: this.hasAdblock});
        this.videosHandler = new VideosHandler({gameManager, sdk: this.sdk, hasAdblock: this.hasAdblock});
    }

    findProviderActiveAds()
    {
        let availableAds = this.gameManager.config.get('client/ads/collection', {});
        let adsKeys = Object.keys(availableAds);
        if(0 === adsKeys.length){
            return {};
        }
        let adsCollection = {};
        for(let i of adsKeys){
            let ad = availableAds[i];
            if(this.metaData.providerId !== ad.providerId && !ad.enabled){
                continue;
            }
            adsCollection[i] = ad;
        }
        return adsCollection;
    }

    validAdsTypes()
    {
        return [AdsConst.ADS_TYPES.BANNER, AdsConst.ADS_TYPES.EVENT_VIDEO];
    }

    async activate()
    {
        if(!this.sdk){
            if(this.retry === this.metaData.sdkMaxRetries){
                Logger.critical('Missing window.CrazyGames required object.');
            }
            if(this.retry < this.metaData.sdkMaxRetries){
                setTimeout(() => {
                    this.retry++;
                    Logger.info('Missing window.CrazyGames required object, retry #'+this.retry+'.');
                    this.sdk = this.window?.CrazyGames?.SDK;
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
            Logger.critical('Adblock usage error.', e);
        }
        return false;
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
                await this.activateAdBanner(activeAd);
                continue;
            }
            if(AdsConst.ADS_TYPES.EVENT_VIDEO === activeAd.type.key){
                if(activeAd.eventData?.rewardItemId){
                    await this.videosHandler.rewardedGameVideoAd(activeAd);
                    continue;
                }
                await this.videosHandler.midGameVideoAd(activeAd);
            }
        }
    }

    async activateAdBanner(activeAd)
    {
        if (activeAd?.bannerData?.fullTime) {
            if(activeAd?.bannerData?.responsive){
                return this.bannersHandler.createResponsiveBanner(activeAd);
            }
            return await this.bannersHandler.createBanner(activeAd);
        }
        if(activeAd?.bannerData?.uiReferenceId){
            this.events.on('reldens.', () => {

            });
        }
    }
}

module.exports.CrazyGames = CrazyGames;
