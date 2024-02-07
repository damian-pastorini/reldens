/**
 *
 * Reldens - VideosHandler
 *
 */

const { Validator } = require('./validator');
const { AdsConst } = require('../../../constants');
const { Logger, sc } = require('@reldens/utils');

class VideosHandler
{

    constructor(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        this.gameDom = this.gameManager?.gameDom;
        this.events = this.gameManager?.events;
        this.sdk = sc.get(props, 'sdk', false);
        this.hasAdblock = sc.get(props, 'hasAdblock', false);
        this.isEnabled = sc.get(props, 'isEnabled', false);
        this.validator = new Validator();
        this.isPlayingAd = false;
        this.setConfig();
    }
    
    setConfig()
    {
        this.videoMinimumDuration = !this.gameManager
            ? AdsConst.VIDEOS_MINIMUM_DURATION
            : this.gameManager.config.getWithoutLogs(
                'client/ads/general/providers/crazyGames/videoMinimumDuration',
                AdsConst.VIDEOS_MINIMUM_DURATION
            );
        this.awaitAdsTime = !this.gameManager
            ? AdsConst.AWAIT_ADS_TIME
            : this.gameManager.config.getWithoutLogs(
                'client/ads/general/providers/crazyGames/awaitAdsTime',
                AdsConst.AWAIT_ADS_TIME
            );
    }

    async activateAdVideo(activeAd)
    {
        let eventKey = sc.get(activeAd, 'eventKey', false);
        if(!eventKey){
            Logger.warning('Missing event key.', activeAd);
            return false;
        }
        this.events.on(eventKey, async (event) => {
            if(this.isPlayingAd){
                Logger.info('CrazyGames - Another ad is been played.');
                return false;
            }
            if(!this.validator.validate(this) || !await this.validator.canBeActivated(this)){
                Logger.error('CrazyGames - Ad can not be activated.');
                return false;
            }
            if(!this.isEnabled()){
                Logger.info('CrazyGames - SDK not enabled.');
                return false;
            }
            return await this.tryRePlay(activeAd);
        });
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
            await this.gameManager.audioManager.changeMuteState(false, false); // unmute and unlock audio
        });
        let adError = sc.get(activeAd, 'adErrorCallback', async (error) => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - Ad-error callback.', error, (new Date()).getTime());
            this.send({act: AdsConst.ACTIONS.AD_ENDED, ads_id: activeAd.id, error});
            await this.gameManager.audioManager.changeMuteState(false, false); // unmute and unlock audio
        });
        let rewardItemKey = sc.get(activeAd, 'rewardItemKey', false);
        let adType = rewardItemKey ? 'rewarded' : 'midgame';
        await this.gameManager.audioManager.changeMuteState(true, true); // mute and lock audio
        await this.sdk.ad.requestAd(adType, {adStarted, adFinished, adError});
    }

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
