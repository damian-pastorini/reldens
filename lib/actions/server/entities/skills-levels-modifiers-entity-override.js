/**
 *
 * Reldens - SkillsLevelsModifiersEntityOverride
 *
 */

const { SkillsLevelsModifiersEntity } = require(
    '../../../../generated-entities/entities/skills-levels-modifiers-entity'
);
const { sc } = require('@reldens/utils');

class SkillsLevelsModifiersEntityOverride extends SkillsLevelsModifiersEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.properties.level_id.alias = 'level_owner';
        config.listProperties = sc.removeFromArray(config.listProperties, [
            'minValue',
            'maxValue',
            'minProperty',
            'maxProperty'
        ]);
        return config;
    }

}

module.exports.SkillsLevelsModifiersEntityOverride = SkillsLevelsModifiersEntityOverride;
