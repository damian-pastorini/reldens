/**
 *
 * Reldens - MessagesListener
 *
 * Handles incoming messages from the server related to ads and updates the ads plugin state. Every scene room join
 * clears the played ads until the joined room sends its list, so an ad of the room activation waits for the fresh list
 * and never reads the list of the previous room.
 *
 */

const { AdsConst } = require('../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@colyseus/core').Room} Room
 * @typedef {import('./plugin').AdsPlugin} AdsPlugin
 */
class MessagesListener
{

    /**
     * @param {Room} room
     * @param {AdsPlugin} adsPlugin
     * @returns {Promise<void>}
     */
    static async listenMessages(room, adsPlugin)
    {
        adsPlugin.playedAds = null;
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
