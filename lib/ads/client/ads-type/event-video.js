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

const { Logger, sc } = require('@reldens/utils');

class EventVideo
{

    fromModel(adsModel)
    {
        if(!adsModel){
            Logger.warning('AdsModel not provided on EventVideo.');
            return false;
        }
        this.model = adsModel;
        let adsVideo = sc.get(adsModel, 'parent_event_video');
        if(!adsVideo){
            return false;
        }
        this.adsId = adsVideo.ads_id;
        this.eventKey = adsVideo.event_key;
        this.eventData = sc.parseJson(adsVideo.event_data);
        this.itemRewardVideo = sc.get(this.eventData, 'item_id');
        this.sceneChangeVideo = sc.get(this.eventData, 'room_id');
    }

}

module.exports.EventVideo = EventVideo;
