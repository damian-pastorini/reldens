/**
 *
 * Reldens - VideosHandler
 *
 */

const { Validator } = require('./validator');
const { Logger, sc } = require('@reldens/utils');
const {AdsConst} = require("../../../constants");

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
        let adStarted = sc.get(activeAd, 'adStartedCallback', () => {
            this.isPlayingAd = true;
            Logger.info('CrazyGames - MidGame Ad-started callback.', (new Date()).getTime());
            this.send({act: AdsConst.ACTIONS.AD_STARTED, ads_id: activeAd.id});
        });
        let videoMinimumDuration = this.gameManager.config.get(
            'client/ads/general/providers/crazyGames/videoMinimumDuration',
            AdsConst.VIDEOS_MINIMUM_DURATION
        );
        let adFinished = sc.get(activeAd, 'adFinishedCallback', () => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - MidGame Ad-finished callback.', (new Date()).getTime());
            setTimeout(
                () => {
                    this.send({act: AdsConst.ACTIONS.AD_ENDED, ads_id: activeAd.id});
                },
                videoMinimumDuration
            );
        });
        let adError = sc.get(activeAd, 'adErrorCallback', (error) => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - MidGame Ad-error callback.', error, (new Date()).getTime());
            setTimeout(
                () => {
                    this.send({act: AdsConst.ACTIONS.AD_ENDED, ads_id: activeAd.id, error});
                },
                videoMinimumDuration
            );
        });
        let rewardItemKey = sc.get(activeAd, 'rewardItemKey', false);
        let adType = rewardItemKey ? 'rewarded' : 'midgame';
        this.events.on(eventKey, async (event) => {
            await this.sdk.ad.requestAd(adType, {adStarted, adFinished, adError});
        });
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
