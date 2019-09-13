/**
 *
 * Reldens - ConfigManager
 *
 * This class will manage the configurations from the database.
 *
 */

const ConfigModel = require('./model');

class ConfigManager
{

    constructor()
    {
        // initialize config props:
        this.configList = {};
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

}

module.exports = ConfigManager;
