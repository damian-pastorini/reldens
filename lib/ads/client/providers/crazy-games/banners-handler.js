/**
 *
 * Reldens - BannersHandler
 *
 */

const { Logger, sc } = require('@reldens/utils');

class BannersHandler
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

    async createBanner(options, bannerLocalStorageKey)
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
        try {
            let width = sc.get(options.styles, 'width', '300');
            let height = sc.get(options.styles, 'height', '250');
            if(!this.validBannerSize(width+'x'+height)){
                Logger.info('CrazyGames - Invalid Banner size.');
                return false;
            }
            let containerId = bannerLocalStorageKey || options.id;
            if(!containerId){
                Logger.info('CrazyGames - Missing container ID.', options, bannerLocalStorageKey);
                return false;
            }
            let div = this.gameDom?.createElement('div', 'banner-container-'+containerId);
            this.gameDom?.getElement('body')?.append(div);
            if(await this.isEnabled()){
                await this.sdk.banner.requestBanner({
                    id: div.id,
                    width: width,
                    height: height,
                });
            }
            let styles = this.mapStylesWithValues(Object.assign({width, height}, options));
            this.gameDom.setElementStyles(div, styles);
            div.classList.add('ads-banner-container');
            return div;
        } catch (err) {
            Logger.critical('CrazyGames - Error on banner request.', err);
            return false;
        }
    }

    mapStylesWithValues(options)
    {
        let styles = {
            'z-index': 200000000,
            width: sc.get(options, 'width', 300),
            height: sc.get(options, 'height', 250),
            position: '' === sc.get(options.styles, 'position', '') ? options.position : 'absolute'
        };
        let top = sc.get(options.styles, 'top', null);
        if (null !== top) {
            styles.top = top;
        }
        let bottom = sc.get(options.styles, 'bottom', null);
        if (null !== bottom) {
            styles.bottom = bottom;
        }
        let left = sc.get(options.styles, 'left', null);
        if (null !== left) {
            styles.left = left;
        }
        let right = sc.get(options.styles, 'right', null);
        if (null !== right) {
            styles.right = right;
        }
        return styles;
    }

    async createResponsiveBanner(options, bannerLocalStorageKey)
    {
        if(!this.sdk){
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
        /* @NOTE: according to CrazyGames SDK this should be null and provided on the SDK response.
        let width = sc.get(options, 'width', '300');
        let height = sc.get(options, 'height', '250');
        if(!this.validResponsiveBannerSize(width+'x'+height)){
            Logger.info('CrazyGames - Invalid Responsive Banner size.');
            return false;
        }
        */
        try {
            let containerId = bannerLocalStorageKey || options.id;
            if(!containerId){
                Logger.info('CrazyGames - Missing container ID.', options, bannerLocalStorageKey);
                return false;
            }
            let div = this.gameDom?.createElement('div', 'responsive-banner-container-'+containerId);
            let styles = this.mapStylesWithValues(options);
            delete styles['width'];
            delete styles['height'];
            this.gameDom.setElementStyles(div, styles);
            this.gameDom?.getElement('body')?.append(div);
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
