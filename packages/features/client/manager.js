/**
 *
 * Reldens - FeaturesManager
 *
 * This class will handle the features activation on the client side depending on the configuration received from the
 * server.
 *
 */

const { ClientCoreFeatures } = require('./config-client');
const { Logger, sc } = require('@reldens/utils');

class FeaturesManager
{

    constructor(props)
    {
        this.gameManager = sc.getDef(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in FeaturesManager.');
        }
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in FeaturesManager.');
        }
    }

    async loadFeatures(featuresCodeList)
    {
        this.featuresList = {};
        await this.events.emit('reldens.loadFeatures', this);
        for(let i of Object.keys(featuresCodeList)){
            let featureCode = featuresCodeList[i];
            if(sc.hasOwn(ClientCoreFeatures, featureCode)){
                this.featuresList[featureCode] = new ClientCoreFeatures[featureCode]();
                if(typeof this.featuresList[featureCode].setupPack === 'function'){
                    this.featuresList[featureCode].setupPack({gameManager: this.gameManager, events: this.events});
                }
                await this.events.emit('reldens.loadFeature_'+featureCode,
                    this.featuresList[featureCode],
                    this
                );
            }
        }
        return this.featuresList;
    }

}

module.exports.FeaturesManager = FeaturesManager;
