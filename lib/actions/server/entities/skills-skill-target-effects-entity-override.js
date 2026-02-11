/**
 *
 * Reldens - SkillsSkillTargetEffectsEntityOverride
 *
 * Entity override for skills target effects with property configuration.
 *
 */

const { SkillsSkillTargetEffectsEntity } = require(
    '../../../../generated-entities/entities/skills-skill-target-effects-entity'
);
const { sc } = require('@reldens/utils');

class SkillsSkillTargetEffectsEntityOverride extends SkillsSkillTargetEffectsEntity
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

module.exports.SkillsSkillTargetEffectsEntityOverride = SkillsSkillTargetEffectsEntityOverride;
