/**
 *
 * Reldens - FeaturesManager
 *
 * This class will handle the features activation on the client side depending on the configuration received from the
 * server.
 *
 */

const { EventsManager } = require('@reldens/utils');
const { ClientCoreFeatures } = require('./config-client');

class FeaturesManager
{

    loadFeatures(featuresCodeList)
    {
        this.featuresList = {};
        EventsManager.emit('reldens.loadFeatures', this);
        for(let i of Object.keys(featuresCodeList)){
            let featureCode = featuresCodeList[i];
            if({}.hasOwnProperty.call(ClientCoreFeatures, featureCode)){
                this.featuresList[featureCode] = new ClientCoreFeatures[featureCode]();
                EventsManager.emit('reldens.loadFeature_'+featureCode, this.featuresList[featureCode], this);
            }
        }
        return this.featuresList;
    }

}

module.exports.FeaturesManager = FeaturesManager;
