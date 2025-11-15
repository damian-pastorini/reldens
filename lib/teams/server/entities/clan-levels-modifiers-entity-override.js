/**
 *
 * Reldens - ClanLevelsModifiersEntityOverride
 *
 */

const { ClanLevelsModifiersEntity } = require('../../../../generated-entities/entities/clan-levels-modifiers-entity');
const { sc } = require('@reldens/utils');

class ClanLevelsModifiersEntityOverride extends ClanLevelsModifiersEntity
{

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
