/**
 *
 * Reldens - GameMonetize
 *
 * SDK documentation: https://github.com/MonetizeGame/GameMonetize.com-SDK
 *
 */

const { AdsProvider } = require('../ads-provider');
const { AdsConst } = require('../../constants');
const { Logger, sc} = require('@reldens/utils');

class GameMonetize
{

    constructor(providerModel, gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = gameManager?.gameDom;
        this.events = gameManager?.events;
        this.window = gameManager?.gameDom?.getWindow();
        this.metaData = providerModel;
        this.setSdkOptions();
        this.sdk = this.window?.sdk;
        this.retry = 0;
        this.isPlayingAd = false;
        this.environment = AdsConst.ENVIRONMENTS.DISABLED;
        if(!this.metaData.sdkRetryTime){
            this.metaData.sdkRetryTime = 500;
        }
        if(!this.metaData.sdkMaxRetries){
            this.metaData.sdkMaxRetries = 10;
        }
        this.activeAds = this.fetchActiveAds(providerModel);
        this.setConfig();
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

    eventKeys()
    {
        return {
            sdkAdStarted: 'SDK_GAME_PAUSE',
            sdkAdEnded: 'SDK_GAME_START',
            sdkReady: 'SDK_READY',
        }
    }

    setSdkOptions(activeAd)
    {
        if(!this.gameDom){
            return false;
        }
        if(!this.metaData.gameId){
            Logger.error('Game ID undefined in GameMonetize.');
            return false;
        }
        this.gameDom.getWindow().SDK_OPTIONS = {
            gameId: this.metaData.gameId,
            onEvent: async (event) => {
                switch (event.name) {
                    case this.eventKeys().sdkAdStarted:
                        // pause game logic / mute audio:
                        await this.adStartedCallback(event, activeAd);
                        break;
                    case this.eventKeys().sdkAdEnded:
                        // advertisement done, resume game logic and unmute audio:
                        await this.adEndedCallback(event, activeAd);
                        break;
                    case this.eventKeys().sdkReady:
                        // when sdk is ready:
                        await this.sdkReadyCallback(event, activeAd);
                        break;
                }
            }
        };
    }

    setConfig()
    {
        this.videoMinimumDuration = !this.gameManager
            ? AdsConst.VIDEOS_MINIMUM_DURATION
            : this.gameManager.config.getWithoutLogs(
                'client/ads/general/providers/gameMonetize/videoMinimumDuration',
                AdsConst.VIDEOS_MINIMUM_DURATION
            );
        this.awaitAdsTime = !this.gameManager
            ? AdsConst.AWAIT_ADS_TIME
            : this.gameManager.config.getWithoutLogs(
                'client/ads/general/providers/gameMonetize/awaitAdsTime',
                AdsConst.AWAIT_ADS_TIME
            );
    }

    validAdsTypes()
    {
        return [AdsConst.ADS_TYPES.EVENT_VIDEO];
    }

    async adStartedCallback(event, activeAd)
    {
        this.isPlayingAd = true;
        await this.gameManager.audioManager.changeMuteState(false);
        if(!activeAd){
            return false;
        }
        Logger.info('GameMonetize - Ad-started callback.', (new Date()).getTime());
        this.send({act: AdsConst.ACTIONS.AD_STARTED, ads_id: activeAd.id});
    }

    async adEndedCallback(event, activeAd)
    {
        this.isPlayingAd = false;
        await this.gameManager.audioManager.changeMuteState(true);
        if(!activeAd){
            return false;
        }
        Logger.info('GameMonetize - Ad-finished callback.', (new Date()).getTime());
        //setTimeout(
        //    () => {
                this.send({act: AdsConst.ACTIONS.AD_ENDED, ads_id: activeAd.id});
        //    },
        //    this.videoMinimumDuration
        //);
    }

    async sdkReadyCallback(event, activeAd)
    {
        this.sdk = this.window.sdk;
    }

    async activate()
    {
        if(!this.sdk){
            if(this.retry === this.metaData.sdkMaxRetries){
                Logger.critical('GameMonetize required object.');
                return false;
            }
            if(this.retry < this.metaData.sdkMaxRetries){
                setTimeout(() => {
                    this.retry++;
                    Logger.info('GameMonetize required object, retry #'+this.retry+'.');
                    this.sdk = this.window?.sdk;
                    if(this.sdk){
                        Logger.info('GameMonetize object found.');
                    }
                    this.activate();
                }, this.metaData.sdkRetryTime);
            }
            return false;
        }
        await this.activateAds();
    }

    async activateAds()
    {
        let activeKeys = Object.keys(this.activeAds);
        if(0 === activeKeys.length){
            Logger.info('None active ads.');
            return false;
        }
        for(let i of activeKeys){
            let activeAd = this.activeAds[i];
            if(AdsConst.ADS_TYPES.EVENT_VIDEO === activeAd.type.key){
                let eventKey = sc.get(activeAd, 'eventKey', false);
                if(!eventKey){
                    Logger.warning('Missing event key.', activeAd);
                    return false;
                }
                this.events.on(eventKey, async (event) => {
                    Logger.info('Event fired, playing ad.', event, activeAd);
                    if(this.isPlayingAd){
                        Logger.info('GameMonetize - Ad is been played.');
                        return false;
                    }
                    return await this.tryRePlay(activeAd);
                });
            }
        }
    }

    async tryRePlay(activeAd)
    {
        let adsPlugin = this.gameManager.getFeature('ads');
        if(null === adsPlugin.playedAds){
            setTimeout(
                () => {
                    this.tryRePlay(activeAd);
                },
                this.awaitAdsTime
            );
            return false;
        }
        this.setSdkOptions(activeAd);
        if(!sc.isObjectFunction(this.sdk, 'showBanner')){
            Logger.critical('GameMonetize SDK not ready.');
            return false;
        }
        await this.sdk.showBanner();
    }

    send(props)
    {
        let room = this.gameManager.activeRoomEvents?.room;
        if(!room){
            Logger.warning('GameMonetize - Room undefined to send an Ad Video message.');
            return false;
        }
        return room.send('*', props);
    }

}

module.exports.GameMonetize = GameMonetize;
