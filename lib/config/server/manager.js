/**
 *
 * Reldens - ConfigManager
 *
 * Manages configurations from a database and includes default values from config files.
 * Loads server and client configurations, processes them by type, and makes them available
 * throughout the application.
 *
 */

const { ConfigProcessor } = require('../processor');
const { ConfigConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');
const PackageData = require('../../../package.json');

/**
 * @typedef {Object} ConfigManagerProps
 * @property {EventsManager} [events] - Events manager instance from @reldens/utils
 * @property {BaseDataServer} [dataServer] - Data server instance from @reldens/storage
 * @property {Object<string, Function>} [customClasses] - Custom class overrides map
 */
class ConfigManager extends ConfigProcessor
{

    /**
     * @param {ConfigManagerProps} props
     */
    constructor(props)
    {
        super();
        /** @type {EventsManager|false} - Events manager for pub/sub */
        this.events = sc.get(props, 'events', false);
        /** @type {BaseDataServer|false} - Data server for database access */
        this.dataServer = sc.get(props, 'dataServer', false);
        /** @type {{server: Object<string, any>, client: Object<string, any>}} - Configuration storage */
        this.configList = {
            server: {},
            client: {}
        };
        this.configList.server.customClasses = sc.get(props, 'customClasses', {});
    }

    /**
     * @returns {Promise<boolean|void>}
     */
    async loadConfigurations()
    {
        if(!this.events){
            Logger.error('EventsManager undefined in ConfigManager.');
            return false;
        }
        if(!this.dataServer){
            Logger.error('Data Server undefined in ConfigManager.');
            return false;
        }
        this.configList.client.gameEngine = {version: PackageData.version};
        await this.events.emit('reldens.beforeLoadConfigurations', {configManager: this});
        let configCollection = await this.dataServer.getEntity('config').loadAll();
        for(let config of configCollection){
            // create an object for each scope:
            if(!sc.hasOwn(this.configList, config.scope)){
                this.configList[config.scope] = {};
            }
            let pathSplit = config.path.split('/');
            // path must have at least 2 parts:
            if(2 > pathSplit.length){
                Logger.error('Invalid configuration:', config);
                continue;
            }
            let parsedValue = await this.getParsedValue(config);
            this.loopObjectAndAssignProperty(this.configList[config.scope], pathSplit, parsedValue);
        }
        Object.assign(this, this.configList);
    }

    /**
     * @param {Object} configList
     * @param {Array<string>} pathSplit
     * @param {any} parsedValue
     * @returns {void}
     */
    loopObjectAndAssignProperty(configList, pathSplit, parsedValue)
    {
        let idx = pathSplit[0];
        if(!sc.hasOwn(configList, idx)){
            configList[idx] = 1 < pathSplit.length ? {} : parsedValue;
        }
        if(1 < pathSplit.length){
            this.loopObjectAndAssignProperty(configList[idx], pathSplit.slice(1, pathSplit.length), parsedValue);
        }
    }

    /**
     * Since everything coming from the database is a string then we parse the config type to return the value in the
     * proper type.
     *
     * @param {Object} config
     * @returns {Promise<any>}
     */
    async getParsedValue(config)
    {
        await this.events.emit('reldens.beforeGetParsedValue', {configManager: this, config: config});
        if(config.type === ConfigConst.CONFIG_TYPE_TEXT){
            return config.value.toString();
        }
        if(config.type === ConfigConst.CONFIG_TYPE_BOOLEAN){
            return !(config.value === 'false' || config.value === '0');
        }
        if(config.type === ConfigConst.CONFIG_TYPE_FLOAT){
            return parseFloat(config.value);
        }
        if(config.type === ConfigConst.CONFIG_TYPE_JSON){
            try {
                return sc.toJson(config.value);
            } catch (e) {
                Logger.error('Invalid JSON on configuration:', config);
            }
        }
        if(config.type === ConfigConst.CONFIG_TYPE_COMMA_SEPARATED){
            return config.value.split(',');
        }
        return config.value;
    }

}

module.exports.ConfigManager = ConfigManager;
