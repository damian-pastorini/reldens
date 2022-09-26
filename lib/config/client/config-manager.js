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
            customClasses: {
                message: {
                    listeners: {}
                }
            },
            message: {
                listeners: {}
            }
        };
    }

}

module.exports.ConfigManager = ConfigManager;
