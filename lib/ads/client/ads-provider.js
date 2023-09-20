/**
 *
 * Reldens - AdsProvider
 *
 */

const { Logger } = require('@reldens/utils');

class AdsProvider
{

    static fetchActiveAdsByProviderId(providerId, validAdsTypes, availableAds)
    {
        if(!providerId){
            return {};
        }
        let adsKeys = Object.keys(availableAds);
        if(0 === adsKeys.length){
            return {};
        }
        let adsCollection = {};
        for(let i of adsKeys){
            let ad = availableAds[i];
            if(providerId !== ad.provider.id){
                Logger.info('Filtered ad by provider ID.', {expectedId: providerId, adProviderId: ad.provider.id});
                continue;
            }
            if(!ad.enabled){
                Logger.info('Ad not enabled.', ad);
                continue;
            }
            if(-1 === validAdsTypes.indexOf(ad.type.key)){
                Logger.info('Invalid ad type.', ad);
                continue;
            }
            adsCollection[i] = ad;
        }
        Logger.info({providerId, activeProviderAds: adsCollection});
        return adsCollection;
    }

}

module.exports.AdsProvider = AdsProvider;
