/**
 *
 * Reldens - Resurrection Ad Loaded Config
 *
 * The resurrection ad values the ads plugin reads once from the config and passes to its ResurrectionAdGate (the
 * resurrection ads key, the ads collection and the videos maximum duration) are set again from the current config,
 * like the server restart that reads them again, so a resurrection ad override or restore reaches the next death.
 *
 */

const { AdsConst } = require('../../../lib/ads/constants');

class ResurrectionAdLoadedConfig
{

    static applyGateValues(serverManager)
    {
        let resurrectionAdGate = serverManager.featuresManager.featuresList.ads?.package?.resurrectionAdGate;
        if(!resurrectionAdGate){
            return false;
        }
        let configManager = serverManager.configManager;
        resurrectionAdGate.adsKey = configManager.getWithoutLogs(AdsConst.CONFIG_PATHS.RESURRECTION_ADS_KEY, '');
        resurrectionAdGate.adsCollection = configManager.getWithoutLogs(AdsConst.CONFIG_PATHS.COLLECTION, {});
        resurrectionAdGate.maximumDuration = configManager.getWithoutLogs(
            AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION,
            AdsConst.VIDEOS_MAXIMUM_DURATION
        );
        return true;
    }

}

module.exports.ResurrectionAdLoadedConfig = ResurrectionAdLoadedConfig;
