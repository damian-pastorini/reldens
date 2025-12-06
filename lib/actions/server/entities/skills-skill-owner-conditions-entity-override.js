/**
 *
 * Reldens - SkillsSkillOwnerConditionsEntityOverride
 *
 */

const { SkillsSkillOwnerConditionsEntity } = require(
    '../../../../generated-entities/entities/skills-skill-owner-conditions-entity'
);

class SkillsSkillOwnerConditionsEntityOverride extends SkillsSkillOwnerConditionsEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.properties.skill_id.alias = 'parent_skill';
        return config;
    }

}

module.exports.SkillsSkillOwnerConditionsEntityOverride = SkillsSkillOwnerConditionsEntityOverride;
