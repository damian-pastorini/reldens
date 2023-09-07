/**
 *
 * Reldens - MessagesListener
 *
 */

const { AdsConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class MessagesListener
{

    static async listenMessages(room, adsPlugin)
    {
        room.onMessage('*', (message) => {
            if(AdsConst.ACTIONS.ADS_PLAYED !== message.act){
                return false;
            }
            adsPlugin.playedAds = {};
            if(!message.playedAdsModels){
                Logger.info('None played ads.', message);
                return false;
            }
            for(let playedAd of message.playedAdsModels){
                adsPlugin.playedAds[playedAd.ads_id] = playedAd;
            }
            return true;
        });
    }

}

module.exports.MessagesListener = MessagesListener;
