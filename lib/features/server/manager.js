/**
 *
 * Reldens - FeaturesManager
 *
 */

const { SetupServerProperties } = require('./setup-server-properties');
const { ServerCoreFeatures } = require('./config-server');
const { Logger, sc } = require('@reldens/utils');

class FeaturesManager
{

    constructor(props)
    {
        // all available features listed in config file:
        this.availableFeatures = ServerCoreFeatures;
        this.featuresList = {};
        this.featuresCodeList = [];
        this.events = sc.get(props, 'events', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.config = sc.get(props, 'config', {});
    }

    async loadFeatures()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in FeaturesManager.');
            return false;
        }
        if(!this.dataServer){
            Logger.error('DataServer undefined in FeaturesManager.');
            return false;
        }
        let featuresCollection = await this.dataServer.getEntity('features').loadBy('is_enabled', 1);
        let setupServerProperties = new SetupServerProperties({
            events: this.events,
            dataServer: this.dataServer,
            config: this.config,
            featuresManager: this,
        });
        if(!setupServerProperties.validate()){
            return false;
        }
        for(let featureEntity of featuresCollection){
            this.featuresCodeList.push(featureEntity.code);
            // @NOTE: featuresCodeList this will be sent to the client, so we need the complete list from the database
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
                if('function' === typeof featureEntity.package.setup){
                    await featureEntity.package.setup(setupServerProperties);
                }
                // for last add the feature entity to the list:
                this.featuresList[featureEntity.code] = featureEntity;
                Logger.info('Enabled feature: ' + featureEntity.code);
            }
        }
        this.events.emit('reldens.featuresManagerLoadFeaturesAfter', {featuresManager: this, featuresCollection});
        // return the features code list:
        return this.featuresCodeList;
    }

}

module.exports.FeaturesManager = FeaturesManager;
