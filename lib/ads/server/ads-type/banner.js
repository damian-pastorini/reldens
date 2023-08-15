/**
 *
 * Reldens - Banner
 *
 * - FullTimeBanner:
 * This banner will be displayed from the login page.
 * If is closed the game will reload the page.
 * It will be re-generated every X time.
 *
 * - OpenUiBanner:
 * This banner will be displayed every time the specified UI (all or a single one) is opened, and automatically closed
 * when the UI is closed.
 *
 */

const { BaseAd } = require('./base-ad');
const { Logger, sc } = require('@reldens/utils');

class Banner extends BaseAd
{

    static fromModel(adsModel)
    {
        return new this(adsModel);
    }

    constructor(adsModel)
    {
        super(adsModel);
        return this.setBannerDataFromModel(adsModel);
    }

    setBannerDataFromModel(adsModel)
    {
        let adsBanner = sc.get(adsModel, 'parent_banner');
        if(!adsBanner){
            Logger.warning('Parent banner not provided on AdsModel for Banner.', adsModel);
            return false;
        }
        this.bannerData = sc.parseJson(adsBanner.banner_data);
        // @TODO - BETA - Add item rewards on banner click X times validated on server side.
    }

    clientData()
    {
        let data = super.clientData();
        data.bannerData = this.bannerData;
        return data;
    }

}

module.exports.Banner = Banner;
