/**
 *
 * Reldens - CrazyGames
 *
 */

const { BannersHandler } = require('./crazy-games/banners-handler');
const { VideosHandler } = require('./crazy-games/videos-handler');
const { AdsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

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
        let handlersProps = {gameManager, sdk: this.sdk, hasAdblock: this.hasAdblock, isEnabled: this.isEnabled};
        this.bannersHandler = new BannersHandler(handlersProps);
        this.videosHandler = new VideosHandler(handlersProps);
        this.activeBanners = {};
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
        if(!activeAd){
            return false;
        }
        let bannerData = activeAd.bannerData;
        if(!bannerData){
            return false;
        }
        let isFullTimeBanner = sc.get(bannerData, 'fullTime', false);
        let isResponsive = sc.get(bannerData, 'responsive', false);
        if(isFullTimeBanner){
            return await this.handleBannerType(isResponsive, activeAd);
        }
        let uiReferenceId = sc.get(bannerData, 'uiReferenceId', false);
        if(!uiReferenceId){
            Logger.warning('Missing banner reference ID.');
            return false;
        }
        this.events.on('reldens.openUI', async (event) => {
            if('ANY' === uiReferenceId || event.openButton.id === uiReferenceId){
                this.activeBanners[activeAd.id+'-'+event.openButton.id] = await this.handleBannerType(
                    isResponsive,
                    activeAd
                );
            }
        });
        this.events.on('reldens.closeUI', async (event) => {
            if(this.activeBanners[activeAd.id+'-'+event.openButton.id]){
                this.activeBanners[activeAd.id+'-'+event.openButton.id].remove();
            }
        });
    }

    async handleBannerType(isResponsive, activeAd)
    {
        if (isResponsive) {
            return this.bannersHandler.createResponsiveBanner(activeAd);
        }
        return await this.bannersHandler.createBanner(activeAd);
    }

}

module.exports.CrazyGames = CrazyGames;
