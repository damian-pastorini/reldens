/**
 *
 * Reldens - VideosHandler
 *
 */

const { Validator } = require('./validator');
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
        let requestedAddId = sc.randomString(32);
        let adStarted = sc.get(activeAd, 'adStartedCallback', () => {
            this.isPlayingAd = true;
            Logger.info('CrazyGames - MidGame Ad-started callback.', (new Date()).getTime());
            this.gameManager.activeRoomEvents?.room?.send('*', {act: 'ad-activated', requestedAddId, activeAd});
        });
        let adFinished = sc.get(activeAd, 'adFinishedCallback', () => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - MidGame Ad-finished callback.', (new Date()).getTime());
            this.gameManager.activeRoomEvents?.room?.send('*', {act: 'ad-finished', requestedAddId, activeAd});
        });
        let adError = sc.get(activeAd, 'adErrorCallback', (error) => {
            this.isPlayingAd = false;
            Logger.info('CrazyGames - MidGame Ad-error callback.', error, (new Date()).getTime());
            this.gameManager.activeRoomEvents?.room?.send('*', {act: 'ad-error', requestedAddId, activeAd, error});
        });
        let rewardItemId = sc.get(activeAd, 'rewardItemId', false);
        let adType = rewardItemId ? 'rewarded' : 'midgame';
        this.events.on(eventKey, async (event) => {
            await this.sdk.ad.requestAd(adType, {adStarted, adFinished, adError});
        });
    }

}

module.exports.VideosHandler = VideosHandler;
