/**
 *
 * Reldens - VideosHandler
 *
 * Manages video ad playback and rewards for the CrazyGames SDK. The ads events are listened before the SDK is loaded, an
 * ad event fired while the SDK is not loaded yet (like the activation of the first room on the login) is queued and
 * played once the provider activates the SDK, and no ad is requested when the SDK environment is disabled.
 *
 */

const { Validator } = require('./validator');
const { AdsConst } = require('../../../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('./validator').Validator} Validator
 *
 * @typedef {Object} VideosHandlerProps
 * @property {GameManager} [gameManager] - The game manager instance
 * @property {Object} [sdk] - The CrazyGames SDK instance
 * @property {Function} [hasAdblock] - Function to check for ad blocker
 * @property {Function} [isEnabled] - Function to check if SDK is enabled
 */
class VideosHandler
{

    /**
     * @param {VideosHandlerProps} props
     */
    constructor(props)
    {
        /** @type {GameManager|false} */
        this.gameManager = sc.get(props, 'gameManager', false);
        /** @type {Object} */
        this.gameDom = this.gameManager?.gameDom;
        /** @type {Object} */
        this.events = this.gameManager?.events;
        /** @type {Object|false} */
        this.sdk = sc.get(props, 'sdk', false);
        /** @type {Function|false} */
        this.hasAdblock = sc.get(props, 'hasAdblock', false);
        /** @type {Function|false} */
        this.isEnabled = sc.get(props, 'isEnabled', false);
        /** @type {Validator} */
        this.validator = new Validator();
        /** @type {boolean} */
        this.isPlayingAd = false;
        /** @type {Object<string, Object>} */
        this.queuedAds = {};
        this.setConfig();
    }

    setConfig()
    {
        /** @type {number} */
        this.videoMinimumDuration = !this.gameManager
            ? AdsConst.VIDEOS_MINIMUM_DURATION
            : this.gameManager.config.getWithoutLogs(
                'client/ads/general/providers/crazyGames/videoMinimumDuration',
                AdsConst.VIDEOS_MINIMUM_DURATION
            );
        /** @type {number} */
        this.awaitAdsTime = !this.gameManager
            ? AdsConst.AWAIT_ADS_TIME
            : this.gameManager.config.getWithoutLogs(
                'client/ads/general/providers/crazyGames/awaitAdsTime',
                AdsConst.AWAIT_ADS_TIME
            );
    }

    /**
     * @param {Object} activeAd
     * @returns {Promise<boolean>}
     */
    async activateAdVideo(activeAd)
    {
        let eventKey = sc.get(activeAd, 'eventKey', false);
        if(!eventKey){
            Logger.warning('Missing event key.', activeAd);
            return false;
        }
        this.events.on(eventKey, async () => {
            return await this.playOrQueueAd(activeAd);
        });
        return true;
    }

    /**
     * @param {Object} activeAd
     * @returns {Promise<boolean>}
     */
    async playOrQueueAd(activeAd)
    {
        if(!this.sdk){
            Logger.info('CrazyGames - SDK not loaded yet, ad queued.', activeAd.id);
            this.queuedAds[activeAd.id] = activeAd;
            return false;
        }
        if(this.isPlayingAd){
            Logger.info('CrazyGames - Another ad is been played.');
            return false;
        }
        if(!this.validator.validate(this) || !await this.validator.canBeActivated(this)){
            Logger.error('CrazyGames - Ad can not be activated.');
            return false;
        }
        if(!await this.isEnabled()){
            Logger.info('CrazyGames - SDK not enabled.');
            return false;
        }
        return await this.tryRePlay(activeAd);
    }

    /**
     * @returns {Promise<boolean>}
     */
    async playQueuedAds()
    {
        for(let adId of Object.keys(this.queuedAds)){
            let queuedAd = this.queuedAds[adId];
            delete this.queuedAds[adId];
            await this.playOrQueueAd(queuedAd);
        }
        return true;
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
        let playedAd = sc.get(adsPlugin?.playedAds, activeAd.id, false);
        if(playedAd && !activeAd.replay){
            Logger.info('Ad already played', activeAd);
            return false;
        }
        let adStarted = sc.get(activeAd, 'adStartedCallback', () => {
            this.isPlayingAd = true;
            Logger.info('CrazyGames - Ad-started callback.', (new Date()).getTime());
            this.send({act: AdsConst.ACTIONS.AD_STARTED, ads_id: activeAd.id});
        });
        let adFinished = sc.get(activeAd, 'adFinishedCallback', async () => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - Ad-finished callback.', (new Date()).getTime());
            this.send({act: AdsConst.ACTIONS.AD_ENDED, ads_id: activeAd.id});
            await this.gameManager.audioManager.changeMuteState(false, false);
        });
        let adError = sc.get(activeAd, 'adErrorCallback', async (error) => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - Ad-error callback.', error, (new Date()).getTime());
            this.send({act: AdsConst.ACTIONS.AD_FAILED, ads_id: activeAd.id, error});
            await this.gameManager.audioManager.changeMuteState(false, false);
        });
        let rewardItemKey = sc.get(activeAd, 'rewardItemKey', false);
        let adType = rewardItemKey ? 'rewarded' : 'midgame';
        await this.gameManager.audioManager.changeMuteState(true, true);
        await this.sdk.ad.requestAd(adType, {adStarted, adFinished, adError});
    }

    /**
     * @param {Object} props
     * @returns {boolean}
     */
    send(props)
    {
        let roomEvents = this.gameManager?.activeRoomEvents;
        if(!roomEvents){
            Logger.warning('CrazyGames - RoomEvents undefined to send an Ad Video message.');
            return false;
        }
        return roomEvents?.send(props);
    }

}

module.exports.VideosHandler = VideosHandler;
