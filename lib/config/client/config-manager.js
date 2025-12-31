/**
 *
 * Reldens - ConfigManager
 *
 * Client-side configuration manager extending ConfigProcessor.
 *
 */

const { ConfigProcessor } = require('../processor');

class ConfigManager extends ConfigProcessor
{

    constructor()
    {
        super();
        /** @type {Object} */
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
