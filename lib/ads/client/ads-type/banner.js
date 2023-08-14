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

const { Logger, sc } = require('@reldens/utils');

class Banner
{

    fromModel(adsModel)
    {
        if(!adsModel){
            Logger.warning('AdsModel not provided on EventVideo.');
            return false;
        }
        this.model = adsModel;
        let adsBanner = sc.get(adsModel, 'parent_banner');
        if(!adsBanner){
            return false;
        }
        this.adsId = adsModel.id;
        this.bannerData = sc.parseJson(adsBanner.event_data);
        this.itemRewardVideo = sc.get(this.eventData, 'item_id');
        this.sceneChangeVideo = sc.get(this.eventData, 'room_id');
    }

}

module.exports.Banner = Banner;
