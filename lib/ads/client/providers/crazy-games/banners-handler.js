/**
 *
 * Reldens - BannersHandler
 *
 * Manages banner ad creation, placement, and lifecycle for the CrazyGames SDK.
 *
 */

const { Validator } = require('./validator');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('./validator').Validator} Validator
 */

/**
 * @typedef {Object} BannersHandlerProps
 * @property {GameManager} [gameManager] - The game manager instance
 * @property {Object} [metaData] - Provider metadata configuration
 * @property {Object} [sdk] - The CrazyGames SDK instance
 * @property {Function} [hasAdblock] - Function to check for ad blocker
 * @property {Function} [isEnabled] - Function to check if SDK is enabled
 */
class BannersHandler
{

    /**
     * @param {BannersHandlerProps} props
     */
    constructor(props)
    {
        /** @type {GameManager|false} */
        this.gameManager = sc.get(props, 'gameManager', false);
        /** @type {Object} */
        this.metaData = sc.get(props, 'metaData', {});
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
        /** @type {Object<string, Object>} */
        this.activeBanners = {};
        /** @type {Validator} */
        this.validator = new Validator();
    }

    /**
     * @returns {Array<string>}
     */
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

    /**
     * @returns {Array<string>}
     */
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

    /**
     * @param {string} size
     * @returns {boolean}
     */
    validBannerSize(size)
    {
        return -1 !== this.availableBanners().indexOf(size);
    }

    /**
     * @param {string} size
     * @returns {boolean}
     */
    validResponsiveBannerSize(size)
    {
        return -1 !== this.availableResponsiveBanners().indexOf(size);
    }

    /**
     * @param {Object} activeAd
     * @returns {Promise<boolean>}
     */
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

    /**
     * @param {boolean} isResponsive
     * @param {Object} activeAd
     * @param {string} [bannerLocalStorageKey]
     * @returns {Promise<Object|false>}
     */
    async handleBannerType(isResponsive, activeAd, bannerLocalStorageKey)
    {
        if(isResponsive){
            return this.createResponsiveBanner(activeAd, bannerLocalStorageKey);
        }
        return await this.createBanner(activeAd, bannerLocalStorageKey);
    }

    /**
     * @param {Object} activeAd
     * @param {string} [bannerLocalStorageKey]
     * @returns {Promise<Object|false>}
     */
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
        } catch (error) {
            Logger.critical('CrazyGames - Error on banner request.', error);
            return false;
        }
    }

    /**
     * @param {Object} activeAd
     * @returns {Object<string, string|number>}
     */
    mapStylesWithValues(activeAd)
    {
        let styles = {
            'z-index': 200000000,
            width: sc.get(activeAd, 'width', 300),
            height: sc.get(activeAd, 'height', 250),
            position: '' === sc.get(activeAd.styles, 'position', '') ? activeAd.position : 'absolute'
        };
        let top = sc.get(activeAd.styles, 'top', null);
        if(null !== top){
            styles.top = top;
        }
        let bottom = sc.get(activeAd.styles, 'bottom', null);
        if(null !== bottom){
            styles.bottom = bottom;
        }
        let left = sc.get(activeAd.styles, 'left', null);
        if(null !== left){
            styles.left = left;
        }
        let right = sc.get(activeAd.styles, 'right', null);
        if(null !== right){
            styles.right = right;
        }
        return styles;
    }

    /**
     * @param {Object} activeAd
     * @param {string} [bannerLocalStorageKey]
     * @returns {Promise<Object|false>}
     */
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
        } catch (error) {
            Logger.critical('CrazyGames - Error on banner request.', error);
            return false;
        }
    }

}

module.exports.BannersHandler = BannersHandler;
