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
