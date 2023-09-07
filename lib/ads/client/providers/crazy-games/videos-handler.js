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
        if(this.isPlayingAd){
            return false;
        }
        if(!this.validator.validate(this) || !await this.validator.canBeActivated(this)){
            return false;
        }
        if(!this.isEnabled()){
            Logger.info('SDK not enabled.');
            return false;
        }
        let eventKey = sc.get(activeAd, 'eventKey', false);
        if(!eventKey){
            Logger.warning('Missing event key.', activeAd);
            return false;
        }
        this.events.on(eventKey, async (event) => {
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
            Logger.info('CrazyGames - MidGame Ad-started callback.', (new Date()).getTime());
            this.send({act: AdsConst.ACTIONS.AD_STARTED, ads_id: activeAd.id});
        });
        let adFinished = sc.get(activeAd, 'adFinishedCallback', () => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - MidGame Ad-finished callback.', (new Date()).getTime());
            setTimeout(
                () => {
                    this.send({act: AdsConst.ACTIONS.AD_ENDED, ads_id: activeAd.id});
                },
                this.videoMinimumDuration
            );
        });
        let adError = sc.get(activeAd, 'adErrorCallback', (error) => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - MidGame Ad-error callback.', error, (new Date()).getTime());
            setTimeout(
                () => {
                    this.send({act: AdsConst.ACTIONS.AD_ENDED, ads_id: activeAd.id, error});
                },
                this.videoMinimumDuration
            );
        });
        let rewardItemKey = sc.get(activeAd, 'rewardItemKey', false);
        let adType = rewardItemKey ? 'rewarded' : 'midgame';
        await this.sdk.ad.requestAd(adType, {adStarted, adFinished, adError});
    }

    send(props)
    {
        let room = this.gameManager.activeRoomEvents?.room;
        if(!room){
            Logger.warning('Room undefined to send an Ad Video message.');
            return false;
        }
        return room.send('*', props);
    }
}

module.exports.VideosHandler = VideosHandler;
