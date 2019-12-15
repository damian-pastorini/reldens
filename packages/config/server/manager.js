/**
 *
 * Reldens - ConfigManager
 *
 * This class will manage the configurations from the database and also include the default values in the config files.
 *
 */

const { ConfigProcessor } = require('../processor');
const { Logger } = require('../../game/logger');
const { ConfigModel } = require('./model');
const { GameConfig } = require('../../game/server/config');
const { InitialState } = require('../../users/server/initial-state');
const { InitialStats } = require('../../users/server/initial-stats');
const { InitialUser } = require('../../users/server/initial-user');
const { EventsManager } = require('../../game/events-manager');
const { ConfigConst } = require('../constants');

class ConfigManager
{

    constructor()
    {
        // initialize config props with default data:
        this.configList = {
            gameEngine: GameConfig,
            server: {
                players: {
                    initialState: InitialState,
                    initialStats: InitialStats,
                    initialUser: InitialUser
                }
            }
        };
    }

    /**
     * @returns {Promise<{}|*>}
     */
    async loadConfigurations()
    {
        EventsManager.emit('reldens.beforeLoadConfigurations', {configManager: this});
        // get the configurations from the database:
        let configCollection = await ConfigModel.query();
        // set them in the manager property so we can find them by path later:
        for(let config of configCollection){
            // create an object for each scope:
            if(!{}.hasOwnProperty.call(this.configList, config.scope)){
                this.configList[config.scope] = {};
            }
            let pathSplit = config.path.split('/');
            // if path is wrong, less or more than 2 levels and the attribute label:
            if(pathSplit.length !== 3){
                // log an error and continue:
                Logger.error(['Invalid configuration:', config]);
                continue;
            }
            if(!{}.hasOwnProperty.call(this.configList[config.scope], pathSplit[0])){
                this.configList[config.scope][pathSplit[0]] = {};
            }
            if(!{}.hasOwnProperty.call(this.configList[config.scope][pathSplit[0]], pathSplit[1])){
                this.configList[config.scope][pathSplit[0]][pathSplit[1]] = {};
            }
            this.configList[config.scope][pathSplit[0]][pathSplit[1]][pathSplit[2]] = this.getParsedValue(config);
        }
        EventsManager.emit('reldens.afterLoadConfigurations', {configManager: this});
    }

    async loadAndGetProcessor()
    {
        // load configurations:
        await this.loadConfigurations();
        // the config processor instance with contain all the loaded configurations:
        this.processor = Object.assign(ConfigProcessor, this.configList);
        return this.processor;
    }

    /**
     * Since everything coming from the database is a string then we parse the config type to return the value in the
     * proper type.
     *
     * @param config
     * @returns {boolean|number|*}
     */
    getParsedValue(config)
    {
        EventsManager.emit('reldens.beforeGetParsedValue', {configManager: this, config: config});
        if(config.type === ConfigConst.CONFIG_TYPE_TEXT){
            return config.value;
        }
        if(config.type === ConfigConst.CONFIG_TYPE_BOOLEAN){
            return !(config.value === 'false' || config.value === '0');
        }
        if(config.type === ConfigConst.CONFIG_TYPE_NUMBER){
            return parseFloat(config.value);
        }
    }

}

module.exports.ConfigManager = ConfigManager;
