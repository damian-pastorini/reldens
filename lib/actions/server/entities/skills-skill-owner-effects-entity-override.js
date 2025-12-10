/**
 *
 * Reldens - SkillsSkillOwnerEffectsEntityOverride
 *
 * Entity override for skills owner effects with property configuration.
 *
 */

const { SkillsSkillOwnerEffectsEntity } = require(
    '../../../../generated-entities/entities/skills-skill-owner-effects-entity'
);
const { sc } = require('@reldens/utils');

class SkillsSkillOwnerEffectsEntityOverride extends SkillsSkillOwnerEffectsEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.properties.skill_id.alias = 'parent_skill';
        config.listProperties = sc.removeFromArray(config.listProperties, [
            'minValue',
            'maxValue',
            'minProperty',
            'maxProperty'
        ]);
        return config;
    }

}

module.exports.SkillsSkillOwnerEffectsEntityOverride = SkillsSkillOwnerEffectsEntityOverride;
