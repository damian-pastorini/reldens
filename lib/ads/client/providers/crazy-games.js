/**
 *
 * Reldens - CrazyGames
 *
 */

const { Logger, sc } = require('@reldens/utils');

class CrazyGames
{

    constructor(providerModel, gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = gameManager?.gameDom;
        this.window = gameManager?.gameDom?.getWindow();
        this.sdk = window?.CrazyGames?.SDK;
        this.metaData = providerModel;
        this.retry = 0;
        this.environment = 'disabled';
        if(!this.metaData.sdkRetryTime){
            this.metaData.sdkRetryTime = 500;
        }
        if(!this.metaData.sdkMaxRetries){
            this.metaData.sdkMaxRetries = 10;
        }
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
        await this.hasAdblock();
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
            Logger.critical('Adblock usage error.', e);
        }
        return false;
    }


    availableBanners()
    {
        return [
            '728x90',
            '300x250',
            '320x50',
            '468x60',
            '320x100'
        ];
    }

    availableResponsiveBanners()
    {
        return [
            '970x90',
            '320x50',
            '160x600',
            '336x280',
            '728x90',
            '300x600',
            '468x60',
            '970x250',
            '300x250',
            '250x250',
            '120x600'
        ];
    }

    validBannerSize(size)
    {
        return -1 !== this.availableBanners().indexOf(size);
    }

    validResponsiveBannerSize(size)
    {
        return -1 !== this.availableResponsiveBanners().indexOf(size);
    }

    async createBanner(options)
    {
        if(await this.hasAdblock()){
            return false;
        }
        try {
            let width = sc.get(options, 'width', '300');
            let height = sc.get(options, 'height', '250');
            if(!this.validBannerSize(width+'x'+height)){
                Logger.info('CrazyGames - Invalid Banner size.');
                return false;
            }
            let div = this.gameDom?.createElement('div', 'banner-container');
            this.gameDom.setElementStyles(div, {
                width,
                height,
                position: sc.get(options, 'position', 'relative'),
                top: sc.get(options, 'top', 0),
                bottom: sc.get(options, 'bottom', 0),
                left: sc.get(options, 'left', 0),
                right: sc.get(options, 'right', 0)
            });
            this.gameDom?.getElement('body')?.append(div);
            await this.sdk.banner.requestBanner({
                id: div.id,
                width: width,
                height: height,
            });
        } catch (err) {
            Logger.critical('CrazyGames - Error on banner request.', err);
        }
    }

    async createResponsiveBanner(options)
    {
        /* @NOTE: according to CrazyGames SDK this should be null and provided on the SDK response.
        let width = sc.get(options, 'width', '300');
        let height = sc.get(options, 'height', '250');
        if(!this.validResponsiveBannerSize(width+'x'+height)){
            Logger.info('CrazyGames - Invalid Responsive Banner size.');
            return false;
        }
        */
        let div = this.gameDom?.createElement('div', 'responsive-banner-container');
        this.gameDom.setElementStyles(div, {
            position: sc.get(options, 'position', 'relative'),
            top: sc.get(options, 'top', 0),
            bottom: sc.get(options, 'bottom', 0),
            left: sc.get(options, 'left', 0),
            right: sc.get(options, 'right', 0)
        });
        this.gameDom?.getElement('body')?.append(div);
        this.sdk.banner.requestResponsiveBanner(div.id);
    }

    async midGameVideoAd(options)
    {
        if(await this.hasAdblock()){
            return false;
        }
        let adStarted = sc.get(options, 'adStartedCallback', () => {
            Logger.info('CrazyGames - MidGame Ad-started callback not specified.');
        });
        let adFinished = sc.get(options, 'adFinishedCallback', () => {
            Logger.info('CrazyGames - MidGame Ad-finished callback not specified.');
        });
        let adError = sc.get(options, 'adFinishedCallback', (error) => {
            Logger.info('CrazyGames - MidGame Ad-error callback not specified.', error);
        });
        this.sdk.ad.requestAd('midgame', {adStarted, adFinished, adError});
    }

    async rewardedGameVideoAd(options)
    {
        if(await this.hasAdblock()){
            return false;
        }
        let adStarted = sc.get(options, 'adStartedCallback', () => {
            Logger.info('CrazyGames - RewardedGame Ad-started callback not specified.');
        });
        let adFinished = sc.get(options, 'adFinishedCallback', () => {
            Logger.info('CrazyGames - RewardedGame Ad-finished callback not specified.');
        });
        let adError = sc.get(options, 'adFinishedCallback', (error) => {
            Logger.info('CrazyGames - RewardedGame Ad-error callback not specified.', error);
        });
        this.sdk.ad.requestAd('rewarded', {adStarted, adFinished, adError});
    }

}

module.exports.CrazyGames = CrazyGames;
