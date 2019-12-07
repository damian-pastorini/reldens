/**
 *
 * Reldens - FeaturesManager
 *
 * This class will handle the features activation on the client side depending on the configuration received from the
 * server.
 *
 */

const { EventsManager } = require('../../game/events-manager');
const { ClientCoreFeatures } = require('./config-client');

class FeaturesManager
{

    featuresList = {};

    loadFeatures(featuresCodeList)
    {
        EventsManager.emit('reldens.loadFeatures', this);
        for(let idx in featuresCodeList){
            let featureCode = featuresCodeList[idx];
            if({}.hasOwnProperty.call(ClientCoreFeatures, featureCode)){
                this.featuresList[featureCode] = new ClientCoreFeatures[featureCode]();
                EventsManager.emit('reldens.loadFeature_'+featureCode, this.featuresList[featureCode], this);
            }
        }
        return this.featuresList;
    }

}

module.exports.FeaturesManager = FeaturesManager;
