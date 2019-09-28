/**
 *
 * Reldens - ConfigManager
 *
 * This class will manage the configurations from the database and also include the default values in the config files.
 *
 */

const ConfigProcessor = require('../config/processor');
const ConfigModel = require('./model');
const defaultConfigGameEngine = require('../../config/game-engine');
const defaultConfigInitialState = require('../../config/initial-state');
const defaultConfigInitialStats = require('../../config/initial-stats');

const CONFIG_TYPE_BOOLEAN = 'b';
const CONFIG_TYPE_NUMBER = 'i';
const CONFIG_TYPE_TEXT = 't';

class ConfigManager
{

    constructor()
    {
        // config processor:
        this.processor = ConfigProcessor;
        // initialize config props with default data:
        this.configList = {
            gameEngine: defaultConfigGameEngine,
            initialState: defaultConfigInitialState,
            initialStats: defaultConfigInitialStats,
        };
    }

    /**
     * @returns {Promise<{}|*>}
     */
    async loadConfigurations()
    {
        // get the configurations from the database:
        let configCollection = await ConfigModel.query();
        // set them in the manager property so we can find them by path later:
        for(let config of configCollection){
            // create an object for each scope:
            if(!this.configList.hasOwnProperty(config.scope)) {
                this.configList[config.scope] = {};
            }
            let pathSplit = config.path.split('/');
            // if path is wrong, less or more than 2 levels and the attribute label:
            if(pathSplit.length !== 3){
                // log an error and continue:
                console.log('ERROR - Invalid configuration:', config);
                continue;
            }
            if(!this.configList[config.scope].hasOwnProperty(pathSplit[0])){
                this.configList[config.scope][pathSplit[0]] = {};
            }
            if(!this.configList[config.scope][pathSplit[0]].hasOwnProperty(pathSplit[1])){
                this.configList[config.scope][pathSplit[0]][pathSplit[1]] = {};
            }
            this.configList[config.scope][pathSplit[0]][pathSplit[1]][pathSplit[2]] = this.getParsedValue(config);
        }
        // we will return a config processor instance with all the loaded configurations assigned:
        return Object.assign(this.processor, this.configList);
    }

    /**
     * Since everything coming from the database is a string then we parse the config type to return the required value.
     *
     * @param config
     * @returns {boolean|number|*}
     */
    getParsedValue(config)
    {
        if(config.type === CONFIG_TYPE_TEXT){
            return config.value;
        }
        if(config.type === CONFIG_TYPE_BOOLEAN){
            return !(config.value === 'false' || config.value === '0');
        }
        if(config.type === CONFIG_TYPE_NUMBER){
            return parseFloat(config.value);
        }
    }

}

module.exports = ConfigManager;
