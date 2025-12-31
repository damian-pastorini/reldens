/**
 *
 * Reldens - Banner
 *
 * Banner ad type with full-time and UI-triggered display modes.
 *
 * - FullTimeBanner:
 * This banner will be displayed from the login page.
 * If it is closed, the game will reload the page.
 * It will be re-generated every X time.
 *
 * - OpenUiBanner:
 * This banner will be displayed every time the specified UI (all or a single one) is opened and automatically closed
 * when the UI is closed.
 *
 */

const { BaseAd } = require('./base-ad');
const { Logger, sc } = require('@reldens/utils');

class Banner extends BaseAd
{

    /**
     * @param {Object} adsModel
     * @returns {Banner}
     */
    static fromModel(adsModel)
    {
        return new this(adsModel);
    }

    /**
     * @param {Object} adsModel
     */
    constructor(adsModel)
    {
        super(adsModel);
        return this.setBannerDataFromModel(adsModel);
    }

    /**
     * @param {Object} adsModel
     * @returns {boolean}
     */
    setBannerDataFromModel(adsModel)
    {
        let adsBanner = sc.get(adsModel, 'related_ads_banner');
        if(!adsBanner){
            Logger.warning('Parent banner not provided on AdsModel for Banner.', adsModel);
            return false;
        }
        this.bannerData = sc.parseJson(adsBanner.banner_data);
        // @TODO - BETA - Add item rewards on banner click X times validated on server side.
    }

    /**
     * @returns {Object}
     */
    clientData()
    {
        let data = super.clientData();
        data.bannerData = this.bannerData;
        return data;
    }

}

module.exports.Banner = Banner;
