/**
 *
 * Reldens - VideosHandler
 *
 */

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
    }

    async midGameVideoAd(activeAd)
    {
        if(!this.sdk){
            Logger.info('Missing SDK.');
            return false;
        }
        if(!sc.isFunction(this.hasAdblock) || await this.hasAdblock()){
            Logger.info('AdBlocker detected.');
            return false;
        }
        if(!sc.isFunction(this.isEnabled)){
            Logger.info('Missing isEnabled method.');
            return false;
        }
        let adStarted = sc.get(activeAd, 'adStartedCallback', () => {
            Logger.info('CrazyGames - MidGame Ad-started callback not specified.');
        });
        let adFinished = sc.get(activeAd, 'adFinishedCallback', () => {
            Logger.info('CrazyGames - MidGame Ad-finished callback not specified.');
        });
        let adError = sc.get(activeAd, 'adFinishedCallback', (error) => {
            Logger.info('CrazyGames - MidGame Ad-error callback not specified.', error);
        });
        if(this.isEnabled()){
            this.sdk.ad.requestAd('midgame', {adStarted, adFinished, adError});
        }
    }

    async rewardedGameVideoAd(activeAd)
    {
        if(!this.sdk){
            Logger.info('Missing SDK.');
            return false;
        }
        if(!sc.isFunction(this.hasAdblock) || await this.hasAdblock()){
            Logger.info('AdBlocker detected.');
            return false;
        }
        if(!sc.isFunction(this.isEnabled)){
            Logger.info('Missing isEnabled method.');
            return false;
        }
        let adStarted = sc.get(activeAd, 'adStartedCallback', () => {
            Logger.info('CrazyGames - RewardedGame Ad-started callback not specified.');
        });
        let adFinished = sc.get(activeAd, 'adFinishedCallback', () => {
            Logger.info('CrazyGames - RewardedGame Ad-finished callback not specified.');
        });
        let adError = sc.get(activeAd, 'adFinishedCallback', (error) => {
            Logger.info('CrazyGames - RewardedGame Ad-error callback not specified.', error);
        });
        if(this.isEnabled()){
            this.sdk.ad.requestAd('rewarded', {adStarted, adFinished, adError});
        }
    }


}

module.exports.VideosHandler = VideosHandler;
