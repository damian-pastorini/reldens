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
    }

    async midGameVideoAd(activeAd)
    {
        if(!this.validator.validate(this) || !await this.validator.canBeActivated(this)){
            return false;
        }
        if(!this.isEnabled()){
            Logger.info('SDK not enabled.');
            return false;
        }
        let adStarted = sc.get(activeAd, 'adStartedCallback', () => {
            Logger.info('CrazyGames - MidGame Ad-started callback.');
            this.gameManager.activeRoomEvents?.room?.send('*', {act: 'ad-activated', activeAd});
        });
        let adFinished = sc.get(activeAd, 'adFinishedCallback', () => {
            Logger.info('CrazyGames - MidGame Ad-finished callback.');
            this.gameManager.activeRoomEvents?.room?.send('*', {act: 'ad-finished', activeAd});
        });
        let adError = sc.get(activeAd, 'adErrorCallback', (error) => {
            Logger.info('CrazyGames - MidGame Ad-error callback.', error);
            this.gameManager.activeRoomEvents?.room?.send('*', {act: 'ad-error', activeAd, error});
        });
        await this.sdk.ad.requestAd('midgame', {adStarted, adFinished, adError});
    }

    async rewardedGameVideoAd(activeAd)
    {
        if(!this.validator.validate(this) || !await this.validator.canBeActivated(this)){
            return false;
        }
        if(!this.isEnabled()){
            Logger.info('SDK not enabled.');
            return false;
        }
        let adStarted = sc.get(activeAd, 'adStartedCallback', () => {
            Logger.info('CrazyGames - RewardedGame Ad-started callback not specified.');
        });
        let adFinished = sc.get(activeAd, 'adFinishedCallback', () => {
            Logger.info('CrazyGames - RewardedGame Ad-finished callback not specified.');
        });
        let adError = sc.get(activeAd, 'adErrorCallback', (error) => {
            Logger.info('CrazyGames - RewardedGame Ad-error callback not specified.', error);
        });
        await this.sdk.ad.requestAd('rewarded', {adStarted, adFinished, adError});
    }

}

module.exports.VideosHandler = VideosHandler;
