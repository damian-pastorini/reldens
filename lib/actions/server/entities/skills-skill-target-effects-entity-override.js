/**
 *
 * Reldens - SkillsSkillTargetEffectsEntityOverride
 *
 */

const { SkillsSkillTargetEffectsEntity } = require(
    '../../../../generated-entities/entities/skills-skill-target-effects-entity'
);
const { sc } = require('@reldens/utils');

class SkillsSkillTargetEffectsEntityOverride extends SkillsSkillTargetEffectsEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        // config.showProperties.skill_id.alias = 'parent_skill';
        // config.editProperties.skill_id.alias = 'parent_skill';
        // config.listProperties.skill_id.alias = 'parent_skill';
        // config.filterProperties.skill_id.alias = 'parent_skill';
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

module.exports.SkillsSkillTargetEffectsEntityOverride = SkillsSkillTargetEffectsEntityOverride;
