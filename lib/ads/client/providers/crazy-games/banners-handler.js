/**
 *
 * Reldens - BannersHandler
 *
 */

const { Validator } = require('./validator');
const { Logger, sc } = require('@reldens/utils');

class BannersHandler
{

    constructor(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        this.metaData = sc.get(props, 'metaData', {});
        this.gameDom = this.gameManager?.gameDom;
        this.events = this.gameManager?.events;
        this.sdk = sc.get(props, 'sdk', false);
        this.hasAdblock = sc.get(props, 'hasAdblock', false);
        this.isEnabled = sc.get(props, 'isEnabled', false);
        this.activeBanners = {};
        this.validator = new Validator();
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

    async activateAdBanner(activeAd)
    {
        if(!activeAd){
            Logger.info('Missing activate ad.', activeAd);
            return false;
        }
        if(!this.validator.validate(this)){
            Logger.info('Invalid banner.');
            return false;
        }
        let bannerData = activeAd.bannerData;
        if(!bannerData){
            Logger.info('No banner data.');
            return false;
        }
        let isFullTimeBanner = sc.get(bannerData, 'fullTime', false);
        let isResponsive = sc.get(bannerData, 'responsive', false);
        if(isFullTimeBanner){
            return await this.handleBannerType(isResponsive, activeAd);
        }
        let uiReferenceIds = sc.get(bannerData, 'uiReferenceIds', []);
        if(0 === uiReferenceIds.length){
            Logger.warning('Missing banner reference ID.');
            return false;
        }
        this.events.on('reldens.openUI', async (event) => {
            if(-1 !== uiReferenceIds.indexOf('ANY') || -1 !== uiReferenceIds.indexOf(event.openButton.id)){
                let bannerLocalStorageKey = activeAd.id+'-'+event.openButton.id;
                let createdAt = (new Date()).getTime();
                let activeBanner = sc.get(this.activeBanners, bannerLocalStorageKey, false);
                if(activeBanner && createdAt < ( // create time is bigger than the previous created banner + 60s?
                    activeBanner.createdAt + this.metaData.sdkBannerRefreshTime
                )){
                    activeBanner.banner.classList.remove('hidden');
                    return;
                }
                if(activeBanner){
                    activeBanner.banner.remove();
                }
                let banner = await this.handleBannerType(isResponsive, activeAd, bannerLocalStorageKey);
                this.activeBanners[bannerLocalStorageKey] = {createdAt, banner};
            }
        });
        this.events.on('reldens.closeUI', async (event) => {
            let bannerLocalStorageKey = activeAd.id+'-'+event.openButton.id;
            let activeBanner = sc.get(this.activeBanners, bannerLocalStorageKey, false);
            if(activeBanner){
                activeBanner.banner.classList.add('hidden');
            }
        });
    }

    async handleBannerType(isResponsive, activeAd, bannerLocalStorageKey)
    {
        if(isResponsive){
            return this.createResponsiveBanner(activeAd, bannerLocalStorageKey);
        }
        return await this.createBanner(activeAd, bannerLocalStorageKey);
    }

    async createBanner(activeAd, bannerLocalStorageKey)
    {
        if(!this.validator.validate(this) || !await this.validator.canBeActivated(this)){
            return false;
        }
        if(!this.isEnabled()){
            Logger.info('SDK not enabled.');
            return false;
        }
        try {
            let width = sc.get(activeAd.styles, 'width', '300');
            let height = sc.get(activeAd.styles, 'height', '250');
            if(!this.validBannerSize(width+'x'+height)){
                Logger.info('CrazyGames - Invalid Banner size.');
                return false;
            }
            let containerId = bannerLocalStorageKey || activeAd.id;
            if(!containerId){
                Logger.info('CrazyGames - Missing container ID.', activeAd, bannerLocalStorageKey);
                return false;
            }
            let div = this.gameDom.createElement('div', 'banner-container-'+containerId);
            this.gameDom.getElement('body')?.append(div);
            if(await this.isEnabled()){
                await this.sdk.banner.requestBanner({
                    id: div.id,
                    width: width,
                    height: height,
                });
            }
            let styles = this.mapStylesWithValues(Object.assign({width, height}, activeAd));
            this.gameDom.setElementStyles(div, styles);
            div.classList.add('ads-banner-container');
            return div;
        } catch (err) {
            Logger.critical('CrazyGames - Error on banner request.', err);
            return false;
        }
    }

    mapStylesWithValues(activeAd)
    {
        let styles = {
            'z-index': 200000000,
            width: sc.get(activeAd, 'width', 300),
            height: sc.get(activeAd, 'height', 250),
            position: '' === sc.get(activeAd.styles, 'position', '') ? activeAd.position : 'absolute'
        };
        let top = sc.get(activeAd.styles, 'top', null);
        if (null !== top) {
            styles.top = top;
        }
        let bottom = sc.get(activeAd.styles, 'bottom', null);
        if (null !== bottom) {
            styles.bottom = bottom;
        }
        let left = sc.get(activeAd.styles, 'left', null);
        if (null !== left) {
            styles.left = left;
        }
        let right = sc.get(activeAd.styles, 'right', null);
        if (null !== right) {
            styles.right = right;
        }
        return styles;
    }

    async createResponsiveBanner(activeAd, bannerLocalStorageKey)
    {
        if(!this.validator.validate(this) || !await this.validator.canBeActivated(this)){
            return false;
        }
        if(!this.isEnabled()){
            Logger.info('SDK not enabled.');
            return false;
        }
        /* @NOTE: according to CrazyGames SDK this should be null and provided on the SDK response.
        let width = sc.get(activeAd, 'width', '300');
        let height = sc.get(activeAd, 'height', '250');
        if(!this.validResponsiveBannerSize(width+'x'+height)){
            Logger.info('CrazyGames - Invalid Responsive Banner size.');
            return false;
        }
        */
        try {
            let containerId = bannerLocalStorageKey || activeAd.id;
            if(!containerId){
                Logger.info('CrazyGames - Missing container ID.', activeAd, bannerLocalStorageKey);
                return false;
            }
            let div = this.gameDom.createElement('div', 'responsive-banner-container-'+containerId);
            let styles = this.mapStylesWithValues(activeAd);
            delete styles['width'];
            delete styles['height'];
            this.gameDom.setElementStyles(div, styles);
            this.gameDom.getElement('body').append(div);
            if(await this.isEnabled()){
                await this.sdk.banner.requestResponsiveBanner(div.id);
            }
            div.classList.add('ads-banner-container');
            return div;
        } catch (err) {
            Logger.critical('CrazyGames - Error on banner request.', err);
            return false;
        }
    }

}

module.exports.BannersHandler = BannersHandler;
