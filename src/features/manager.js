/**
 *
 * Reldens - FeaturesManager
 *
 * This class will load the features, parse the configuration file and assign them as required.
 *
 */

const configuredFeatures = require('../../config/features');
const FeaturesModel = require('./model');

class FeatureManager
{

    constructor()
    {
        // all available features listed in config file:
        this.availableFeatures = configuredFeatures;
        // initialize features props:
        this.featuresList = {};
        this.featuresCodeList = [];
        this.featuresWithRooms = [];
        this.featuresWithRoomsCodeList = [];
    }

    async loadFeatures()
    {
        // get the features from the database:
        let featuresCollection = await FeaturesModel.query();
        for(let featureEntity of featuresCollection){
            let featureRoom = false;
            // only include enabled features:
            if(featureEntity.hasOwnProperty('is_enabled') && featureEntity.is_enabled){
                featureEntity.room = featureRoom;
                this.featuresList[featureEntity.code] = featureEntity;
                // add the feature to the codes list:
                this.featuresCodeList.push(featureEntity.code);
                // if the feature has a room include it the featuresWithRooms list:
                if(
                    this.availableFeatures.hasOwnProperty(featureEntity.code)
                    && this.availableFeatures[featureEntity.code].hasOwnProperty('room')
                ){
                    featureRoom = this.availableFeatures[featureEntity.code].room;
                    this.featuresWithRooms.push({roomName: featureEntity.code, room: featureRoom});
                    this.featuresWithRoomsCodeList.push(featureEntity.code);
                }
            }
        }
    }

}

module.exports = FeatureManager;
