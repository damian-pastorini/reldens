/**
 *
 * Reldens - ClanLevelsModifiersEntityOverride
 *
 * Customizes admin panel configuration for the ClanLevelsModifiers entity.
 * Removes min/max properties from list view for cleaner admin interface display.
 *
 */

const { ClanLevelsModifiersEntity } = require('../../../../generated-entities/entities/clan-levels-modifiers-entity');
const { sc } = require('@reldens/utils');

class ClanLevelsModifiersEntityOverride extends ClanLevelsModifiersEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.listProperties = sc.removeFromArray(config.listProperties, [
            'minValue',
            'maxValue',
            'minProperty',
            'maxProperty'
        ]);
        return config;
    }

}

module.exports.ClanLevelsModifiersEntityOverride = ClanLevelsModifiersEntityOverride;
