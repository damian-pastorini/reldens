/**
 *
 * Reldens - FeaturesManager
 *
 * This class will load the features, parse the configuration file and assign them as required.
 *
 */

const { ServerCoreFeatures } = require('./config-server');
const { FeaturesModel } = require('./model');

class FeaturesManager
{

    constructor()
    {
        // all available features listed in config file:
        this.availableFeatures = ServerCoreFeatures;
        // initialize features props:
        this.featuresList = {};
        this.featuresCodeList = [];
    }

    async loadFeatures()
    {
        // get the features from the database:
        let featuresCollection = await FeaturesModel.query();
        for(let featureEntity of featuresCollection){
            // add the feature to the codes list:
            this.featuresCodeList.push(featureEntity.code);
            // @NOTE: featuresCodeList this will be sent to the client so we need the complete list from the database
            // to load the features for the client side later.
            if(
                // only include enabled and available features on the server side config:
                {}.hasOwnProperty.call(this.availableFeatures, featureEntity.code)
                && {}.hasOwnProperty.call(featureEntity, 'is_enabled')
                && featureEntity.is_enabled
            ){
                // get feature package server for server side:
                let featurePackage = this.availableFeatures[featureEntity.code];
                // set package on entity:
                featureEntity.package = featurePackage;
                // for last add the feature entity to the list:
                this.featuresList[featureEntity.code] = featureEntity;
            }
        }
        // return the features code list:
        return this.featuresCodeList;
    }

}

module.exports.FeaturesManager = FeaturesManager;
