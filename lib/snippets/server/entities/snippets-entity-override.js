/**
 *
 * Reldens - SnippetsEntityOverride
 *
 */

const { SnippetsEntity } = require('../../../../generated-entities/entities/snippets-entity');

class SnippetsEntityOverride extends SnippetsEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 1300;
        return config;
    }

}

module.exports.SnippetsEntityOverride = SnippetsEntityOverride;
