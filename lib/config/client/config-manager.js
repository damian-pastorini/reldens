/**
 *
 * Reldens - ConfigManager
 *
 */

const { ConfigProcessor } = require('../processor');

class ConfigManager extends ConfigProcessor
{

    constructor()
    {
        super();
        this.client = {
            customClasses: {}
        };
    }

}

module.exports.ConfigManager = ConfigManager;
