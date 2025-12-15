/**
 *
 * Reldens - EventVideo
 *
 * Video ad type triggered by game events with an optional reward system.
 *
 * This video will be visible every time the specified "reldens" event is fired (experimental).
 *
 * - ItemVideoReward:
 * This video will be visible as per request when a specific item is available on an NPC.
 * After seeing the ad, you will get the specified item as a reward.
 *
 * - SceneChangeVideo:
 * This video will be visible every time you enter on the specified scene.
 *
 */

const { BaseAd } = require('./base-ad');
const { Logger, sc } = require('@reldens/utils');

class EventVideo extends BaseAd
{

    /**
     * @param {Object} adsModel
     * @returns {EventVideo}
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
        return this.setVideoDataFromModel(adsModel);
    }

    /**
     * @param {Object} adsModel
     * @returns {boolean}
     */
    setVideoDataFromModel(adsModel)
    {
        let adsVideo = sc.get(adsModel, 'related_ads_event_video');
        if(!adsVideo){
            Logger.warning('Parent video not provided on AdsModel for EventVideo.', adsModel);
            return false;
        }
        this.eventKey = adsVideo.event_key;
        this.eventData = sc.parseJson(adsVideo.event_data);
        this.rewardItemKey = sc.get(this.eventData, 'rewardItemKey');
        this.rewardItemQty = sc.get(this.eventData, 'rewardItemQty');
    }

    /**
     * @returns {Object}
     */
    clientData()
    {
        let data = super.clientData();
        data.eventKey = this.eventKey;
        return data;
    }

}

module.exports.EventVideo = EventVideo;
