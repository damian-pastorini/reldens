/**
 *
 * Reldens - SnippetsEntityOverride
 *
 * Overrides the snippets entity configuration for the admin panel.
 *
 */

const { SnippetsEntity } = require('../../../../generated-entities/entities/snippets-entity');

class SnippetsEntityOverride extends SnippetsEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 1300;
        return config;
    }

}

module.exports.SnippetsEntityOverride = SnippetsEntityOverride;
