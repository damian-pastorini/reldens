/**
 *
 * Reldens - ConfigManager
 *
 * This class will manage the configurations from the database and also include the default values in the config files.
 *
 */

const ConfigModel = require('./model');
const defaultConfigGameEngine = require('../../config/game-engine');
const defaultConfigInitialScene = require('../../config/initial-scene');
const defaultConfigInitialStats = require('../../config/initial-stats');

class ConfigManager
{

    constructor()
    {
        // initialize config props with default data:
        this.configList = {
            gameEngine: defaultConfigGameEngine,
            initialScene: defaultConfigInitialScene,
            initialStats: defaultConfigInitialStats,
        };
        this.configListRaw = {};
    }

    /**
     * @returns {Promise<{}|*>}
     */
    async loadConfigurations()
    {
        // get the configurations from the database:
        let configCollection = await ConfigModel.query();
        // set them in the manager property so we can find them by path later:
        for(let configEntity of configCollection){
            // create an object for each scope:
            if(!this.configList.hasOwnProperty(configEntity.scope)) {
                this.configList[configEntity.scope] = {};
            }
            let pathSplit = configEntity.path.split('/');
            // if path is wrong, less or more than 2 levels and the attribute label:
            if(pathSplit.length !== 3){
                // log an error and continue:
                console.log('ERROR - Invalid configuration:', configEntity);
                continue;
            }
            if(!this.configList[configEntity.scope].hasOwnProperty(pathSplit[0])){
                this.configList[configEntity.scope][pathSplit[0]] = {};
            }
            if(!this.configList[configEntity.scope][pathSplit[0]].hasOwnProperty(pathSplit[1])){
                this.configList[configEntity.scope][pathSplit[0]][pathSplit[1]] = {};
            }
            this.configList[configEntity.scope][pathSplit[0]][pathSplit[1]][pathSplit[2]] = configEntity.value;
            this.configListRaw[configEntity.path] = configEntity;
        }
        return this.configList;
    }

    getConfigByPath(path)
    {
        let result = false;
        if(this.configListRaw.hasOwnProperty(path)){
            result = this.configListRaw[path];
        }
        return result;
    }

}

module.exports = ConfigManager;
