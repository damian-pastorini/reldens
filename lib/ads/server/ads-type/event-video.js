/**
 *
 * Reldens - EventVideo
 *
 * This video will be visible every time the specified "reldens" event is fired (experimental).
 *
 * - ItemVideoReward:
 * This video will be visible as per request when a specific item is available on an NPC.
 * After see the ad you will get the specified item as reward.
 *
 * - SceneChangeVideo:
 * This video will be visible every time you enter on the specified scene.
 *
 */

const { BaseAd } = require('./base-ad');
const { Logger, sc } = require('@reldens/utils');

class EventVideo extends BaseAd
{

    static fromModel(adsModel)
    {
        return new this(adsModel);
    }

    constructor(adsModel)
    {
        super(adsModel);
        return this.setVideoDataFromModel(adsModel);
    }

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


    clientData()
    {
        let data = super.clientData();
        data.eventKey = this.eventKey;
        return data;
    }

}

module.exports.EventVideo = EventVideo;
