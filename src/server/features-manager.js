/**
 *
 * Reldens - FeaturesManager
 *
 * This class will load the features, parse their configuration files and assign them as required.
 *
 */

class FeaturesManager
{

    constructor(options = false)
    {
        this.validate(options);
        this.dataServer = options.dataServer;
        this.availableFeatures = options.availableFeatures;
        this.featuresList = {};
        this.featuresWithRooms = {};
    }

    validate(options)
    {
        if(!options.hasOwnProperty('dataServer')){
            throw new Error('Missing dataServer.');
        }
        if(!options.hasOwnProperty('availableFeatures')){
            throw new Error('Missing availableFeatures.');
        }
    }

    async loadFeatures()
    {
        let featuresQuery = 'SELECT * FROM features;';
        let featuresCollection = await this.dataServer.query(featuresQuery);
        for(let featureEntity of featuresCollection){
            let featureRoom = false;
            if(featureEntity.is_enabled){
                if(
                    this.availableFeatures.hasOwnProperty(featureEntity.code)
                    && this.availableFeatures[featureEntity.code].hasOwnProperty('room')
                ){
                    featureRoom = this.availableFeatures[featureEntity.code].room;
                    this.featuresWithRooms[featureEntity.code] = {roomName: featureEntity.code, room: featureRoom};
                }
            }
            this.featuresList[featureEntity.code] = {
                id: featureEntity.id,
                code: featureEntity.code,
                title: featureEntity.title,
                isEnabled: featureEntity.is_enabled,
                room: featureRoom
            };
        }
    }

}

module.exports = FeaturesManager;
