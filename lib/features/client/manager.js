/**
 *
 * Reldens - FeaturesManager
 *
 * This class will handle features activation on the client depending on the configuration received from the server.
 *
 */

const { ClientCoreFeatures } = require('./config-client');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../game/client/game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class FeaturesManager
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {Object} */
        this.featuresList = {};
    }

    /**
     * @param {Object} featuresCodeList
     * @returns {Promise<Object|boolean>}
     */
    async loadFeatures(featuresCodeList)
    {
        if(!this.gameManager){
            Logger.error('Game Manager undefined in FeaturesManager.');
            return false;
        }
        if(!this.events){
            Logger.error('EventsManager undefined in FeaturesManager.');
            return false;
        }
        await this.events.emit('reldens.loadFeatures', this, featuresCodeList);
        let featuresKeys = Object.keys(featuresCodeList);
        if(0 === featuresKeys.length){
            return this.featuresList;
        }
        for(let i of featuresKeys){
            let featureCode = featuresCodeList[i];
            if(!sc.hasOwn(ClientCoreFeatures, featureCode)){
                continue;
            }
            this.featuresList[featureCode] = new ClientCoreFeatures[featureCode]();
            if('function' === typeof this.featuresList[featureCode].setup){
                await this.featuresList[featureCode].setup({gameManager: this.gameManager, events: this.events});
            }
            await this.events.emit('reldens.loadFeature_'+featureCode, this.featuresList[featureCode], this);
        }
        return this.featuresList;
    }

}

module.exports.FeaturesManager = FeaturesManager;
