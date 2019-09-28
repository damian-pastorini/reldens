/**
 *
 * Reldens - FeaturesClient
 * This class will handle the features activation on the client side depending on the configuration received from the
 * server.
 *
 */

const configuredFeatures = require('../../config/features-client');

class FeaturesClient
{

    constructor()
    {
        this.featuresCodeList = [];
        this.featuresList = {};
    }

    loadFeatures(featuresCodeList)
    {
        this.featuresCodeList = featuresCodeList;
        for(let idx in featuresCodeList){
            let featureCode = featuresCodeList[idx];
            if(configuredFeatures.hasOwnProperty(featureCode)){
                this.featuresList[featureCode] = configuredFeatures[featureCode];
            }
        }
        return this.featuresList;
    }

}

module.exports = FeaturesClient;
