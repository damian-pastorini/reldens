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
            this.configList[configEntity.path] = configEntity;
        }
        return this.configList;
    }

}

module.exports = ConfigManager;
