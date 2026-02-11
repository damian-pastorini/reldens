/**
 *
 * Reldens - SkillsLevelsModifiersEntityOverride
 *
 * Entity override for skills level modifiers with property configuration.
 *
 */

const { SkillsLevelsModifiersEntity } = require(
    '../../../../generated-entities/entities/skills-levels-modifiers-entity'
);
const { sc } = require('@reldens/utils');

class SkillsLevelsModifiersEntityOverride extends SkillsLevelsModifiersEntity
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

module.exports.SkillsLevelsModifiersEntityOverride = SkillsLevelsModifiersEntityOverride;
