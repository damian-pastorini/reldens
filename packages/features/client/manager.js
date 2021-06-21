/**
 *
 * Reldens - FeaturesManager
 *
 * This class will handle the features activation on the client side depending on the configuration received from the
 * server.
 *
 */

const { EventsManagerSingleton, sc } = require('@reldens/utils');
const { ClientCoreFeatures } = require('./config-client');

class FeaturesManager
{

    async loadFeatures(featuresCodeList)
    {
        this.featuresList = {};
        await EventsManagerSingleton.emit('reldens.loadFeatures', this);
        for(let i of Object.keys(featuresCodeList)){
            let featureCode = featuresCodeList[i];
            if(sc.hasOwn(ClientCoreFeatures, featureCode)){
                this.featuresList[featureCode] = new ClientCoreFeatures[featureCode]();
                await EventsManagerSingleton.emit('reldens.loadFeature_'+featureCode,
                    this.featuresList[featureCode],
                    this
                );
            }
        }
        return this.featuresList;
    }

}

module.exports.FeaturesManager = FeaturesManager;
