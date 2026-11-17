/**
 *
 * Reldens - AdsCollectionFinder
 *
 * Finds a loaded and enabled ad by its key or ID, the ads collection is indexed by the ad ID and the messages from the
 * client carry that ID, so the features find their ad by the configured key and compare the IDs. An ad is enabled when
 * the ad and its provider are enabled, the disabled ones are never found so they can not be played or rewarded. The
 * callers read the collection from the config once and keep it.
 *
 */

const { sc } = require('@reldens/utils');

class AdsCollectionFinder
{

    /**
     * @param {Object} adsCollection
     * @param {string} adsKey
     * @returns {Object|boolean}
     */
    static findByKey(adsCollection, adsKey)
    {
        if(!adsKey){
            return false;
        }
        for(let adId of Object.keys(adsCollection)){
            if(adsKey === adsCollection[adId].key && this.isEnabled(adsCollection[adId])){
                return adsCollection[adId];
            }
        }
        return false;
    }

    /**
     * @param {Object} adsCollection
     * @param {number|string} adId
     * @returns {Object|boolean}
     */
    static findById(adsCollection, adId)
    {
        let ad = sc.get(adsCollection, adId, false);
        if(!this.isEnabled(ad)){
            return false;
        }
        return ad;
    }

    /**
     * @param {Object|boolean} ad
     * @returns {boolean}
     */
    static isEnabled(ad)
    {
        if(!ad?.enabled){
            return false;
        }
        return Boolean(ad.provider?.enabled);
    }

    /**
     * @param {Object} adsCollection
     * @param {string} adsKey
     * @param {Object} messageData
     * @returns {boolean}
     */
    static isMessageForAd(adsCollection, adsKey, messageData)
    {
        let ad = this.findByKey(adsCollection, adsKey);
        if(!ad){
            return false;
        }
        return Number(ad.id) === Number(messageData?.ads_id);
    }

}

module.exports.AdsCollectionFinder = AdsCollectionFinder;
