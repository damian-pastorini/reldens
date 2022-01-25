/**
 *
 * Reldens - ConfigManager
 *
 * This class will manage the configurations from the database and also include the default values in the config files.
 *
 */

const { ConfigProcessor } = require('../processor');
const { GameConfig } = require('../../game/server/config');
const { GameCustomClasses } = require('../../game/server/game-custom-classes');
const { ConfigConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');
const PackageData = require('../../../package.json');

class ConfigManager
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ConfigManager.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        // initialize config props with default data:
        this.configList = {
            server: {}
        };
        let customClasses = props.customClasses || {};
        this.configList.server.customClasses = customClasses;
        // custom classes:
        if({} === customClasses){
            GameCustomClasses.definitionErrorLog();
        }
    }

    async loadConfigurations()
    {
        let gameConfig = new GameConfig();
        this.configList.gameEngine = gameConfig.getConfig();
        this.configList.gameEngine.version = PackageData.version;
        await this.events.emit('reldens.beforeLoadConfigurations', {configManager: this});
        // get the configurations from the database:
        let configCollection = await this.dataServer.getEntity('config').loadAll();
        // set them in the manager property to find them by path later:
        for(let config of configCollection){
            // create an object for each scope:
            if(!sc.hasOwn(this.configList, config.scope)){
                this.configList[config.scope] = {};
            }
            let pathSplit = config.path.split('/');
            // if path is wrong, less or more than 2 levels and the attribute label:
            if(pathSplit.length < 3){
                // log an error and continue:
                Logger.error('Invalid configuration:', config);
                continue;
            }
            let parsedValue = await this.getParsedValue(config);
            this.loopObjectAndAssignProperty(this.configList[config.scope], pathSplit, parsedValue);
        }
        await this.events.emit('reldens.afterLoadConfigurations', {configManager: this});
    }

    async loadAndGetProcessor()
    {
        // load configurations:
        await this.loadConfigurations();
        // the config processor instance with contain all the loaded configurations:
        this.processor = Object.assign(ConfigProcessor, this.configList);
        return this.processor;
    }

    loopObjectAndAssignProperty(configList, pathSplit, parsedValue)
    {
        let idx = pathSplit[0];
        if(!sc.hasOwn(configList, idx)){
            if(pathSplit.length > 1){
                configList[idx] = {};
            } else {
                configList[idx] = parsedValue;
            }
        }
        if(pathSplit.length > 1){
            this.loopObjectAndAssignProperty(configList[idx], pathSplit.slice(1, pathSplit.length), parsedValue);
        }
    }

    /**
     * Since everything coming from the database is a string then we parse the config type to return the value in the
     * proper type.
     */
    async getParsedValue(config)
    {
        await this.events.emit('reldens.beforeGetParsedValue', {configManager: this, config: config});
        if(config.type === ConfigConst.CONFIG_TYPE_TEXT){
            return config.value;
        }
        if(config.type === ConfigConst.CONFIG_TYPE_BOOLEAN){
            return !(config.value === 'false' || config.value === '0');
        }
        if(config.type === ConfigConst.CONFIG_TYPE_NUMBER){
            return parseFloat(config.value);
        }
        if(config.type === ConfigConst.CONFIG_TYPE_JSON){
            try {
                return sc.toJson(config.value);
            } catch (e) {
                Logger.error('Invalid JSON on configuration:', config);
            }
        }
        return config.value;
    }

}

module.exports.ConfigManager = ConfigManager;
