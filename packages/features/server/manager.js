/**
 *
 * Reldens - FeaturesManager
 *
 * This class will load the features, parse the configuration file and assign them as required.
 *
 */

const { ServerCoreFeatures } = require('./config-server');
const { FeaturesModel } = require('./model');
const { Logger, sc } = require('@reldens/utils');

class FeaturesManager
{

    constructor(props)
    {
        // all available features listed in config file:
        this.availableFeatures = ServerCoreFeatures;
        // initialize features props:
        this.featuresList = {};
        this.featuresCodeList = [];
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManaged undefined in FeaturesManager.');
        }
    }

    async loadFeatures()
    {
        // get the features from the database:
        let featuresCollection = await FeaturesModel.loadAll();
        for(let featureEntity of featuresCollection){
            // add the feature to the codes list:
            this.featuresCodeList.push(featureEntity.code);
            // @NOTE: featuresCodeList this will be sent to the client so we need the complete list from the database
            // to load the features for the client side later.
            if(
                // only include enabled and available features on the server side config:
                sc.hasOwn(this.availableFeatures, featureEntity.code)
                && sc.hasOwn(featureEntity, 'is_enabled')
                && featureEntity.is_enabled
            ){
                // get feature package server for server side:
                let featurePackage = this.availableFeatures[featureEntity.code];
                // set package on entity:
                featureEntity.package = new featurePackage();
                if(typeof featureEntity.package.setupPack === 'function'){
                    await featureEntity.package.setupPack({events: this.events});
                }
                // for last add the feature entity to the list:
                this.featuresList[featureEntity.code] = featureEntity;
                Logger.info('Enabled feature: ' + featureEntity.code);
            }
        }
        // return the features code list:
        return this.featuresCodeList;
    }

}

module.exports.FeaturesManager = FeaturesManager;
