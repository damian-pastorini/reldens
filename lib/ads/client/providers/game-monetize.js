/**
 *
 * Reldens - GameMonetize
 *
 * SDK documentation: https://github.com/MonetizeGame/GameMonetize.com-SDK
 *
 * Integrates the GameMonetize advertising SDK for video ads with reward functionality.
 *
 */

const { AdsProvider } = require('../ads-provider');
const { AdsConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class GameMonetize
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
        this.setSdkOptions();
        /** @type {Object} */
        this.sdk = this.window?.sdk;
        /** @type {number} */
        this.retry = 0;
        /** @type {boolean} */
        this.isPlayingAd = false;
        /** @type {string} */
        this.environment = AdsConst.ENVIRONMENTS.DISABLED;
        if(!this.metaData.sdkRetryTime){
            this.metaData.sdkRetryTime = 500;
        }
        if(!this.metaData.sdkMaxRetries){
            this.metaData.sdkMaxRetries = 10;
        }
        /** @type {Object<string, Object>} */
        this.activeAds = this.fetchActiveAds(providerModel);
        /** @type {Object|false} */
        this.activeAdBeenPlayed = false;
        this.setConfig();
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
     * @returns {Object<string, string>}
     */
    eventKeys()
    {
        return {
            sdkAdStarted: 'CONTENT_PAUSE_REQUESTED',
            sdkAdEnded: 'SDK_GAME_START',
            sdkReady: 'SDK_READY',
        }
    }

    /**
     * @returns {boolean}
     */
    setSdkOptions()
    {
        if(!this.gameDom){
            return false;
        }
        if(!this.metaData.gameId){
            Logger.error('GameMonetize - Game ID undefined.');
            return false;
        }
        this.gameDom.getWindow().SDK_OPTIONS = {
            gameId: this.metaData.gameId,
            onEvent: async (event) => {
                Logger.info('GameMonetize - SDK event fired: '+event.name);
                switch (event.name) {
                    case this.eventKeys().sdkAdStarted:
                        // pause game logic / mute audio:
                        await this.adStartedCallback(event);
                        break;
                    case this.eventKeys().sdkAdEnded:
                        // advertisement done, resume game logic and unmute audio:
                        await this.adEndedCallback(event);
                        break;
                    case this.eventKeys().sdkReady:
                        // when sdk is ready:
                        await this.sdkReadyCallback(event);
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

    /**
     * @returns {Array<string>}
     */
    validAdsTypes()
    {
        return [AdsConst.ADS_TYPES.EVENT_VIDEO];
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async adStartedCallback(event)
    {
        this.isPlayingAd = true;
        await this.gameManager.audioManager.changeMuteState(true, true); // mute and lock audio
        if(!this.activeAdBeenPlayed){
            Logger.info('AdStartedCallback undefined activeAd.', event, this.activeAdBeenPlayed);
            return false;
        }
        Logger.info('GameMonetize - Ad-started callback.', (new Date()).getTime());
        this.send({act: AdsConst.ACTIONS.AD_STARTED, ads_id: this.activeAdBeenPlayed.id});
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async adEndedCallback(event)
    {
        this.isPlayingAd = false;
        await this.gameManager.audioManager.changeMuteState(false, false);
        if(!this.activeAdBeenPlayed){
            Logger.info('AdEndedCallback undefined activeAd.', event, this.activeAdBeenPlayed);
            return false;
        }
        Logger.info('GameMonetize - Ad-finished callback.', (new Date()).getTime());
        this.send({act: AdsConst.ACTIONS.AD_ENDED, ads_id: this.activeAdBeenPlayed.id});
    }

    /**
     * @param {Object} event
     * @returns {Promise<void>}
     */
    async sdkReadyCallback(event)
    {
        this.sdk = this.window.sdk;
    }

    /**
     * @returns {Promise<boolean>}
     */
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

    /**
     * @returns {Promise<boolean>}
     */
    async activateAds()
    {
        let activeKeys = Object.keys(this.activeAds);
        if(0 === activeKeys.length){
            Logger.info('None active ads.');
            return false;
        }
        for(let i of activeKeys){
            let activeAd = this.activeAds[i];
            if(AdsConst.ADS_TYPES.EVENT_VIDEO !== activeAd.type.key){
                continue;
            }
            let eventKey = sc.get(activeAd, 'eventKey', false);
            if(!eventKey){
                Logger.warning('Missing event key.', activeAd);
                return false;
            }
            this.events.on(eventKey, async (event) => {
                Logger.info('GameMonetize - Video event fired, playing ad.', event, activeAd);
                if(this.isPlayingAd){
                    Logger.info('GameMonetize - Ad is been played.');
                    return false;
                }
                return await this.tryRePlay(activeAd);
            });
        }
    }

    /**
     * @param {Object} activeAd
     * @returns {Promise<boolean>}
     */
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
        this.activeAdBeenPlayed = activeAd;
        if(!sc.isObjectFunction(this.sdk, 'showBanner')){
            Logger.critical('GameMonetize SDK not ready.');
            return false;
        }
        await this.sdk.showBanner();
    }

    /**
     * @param {Object} props
     * @returns {boolean}
     */
    send(props)
    {
        let roomEvents = this.gameManager?.activeRoomEvents;
        if(!roomEvents){
            Logger.warning('GameMonetize - RoomEvents undefined to send an Ad Video message.');
            return false;
        }
        return roomEvents.send(props);
    }

}

module.exports.GameMonetize = GameMonetize;
