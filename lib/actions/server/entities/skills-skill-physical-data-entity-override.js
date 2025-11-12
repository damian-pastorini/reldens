/**
 *
 * Reldens - SkillsSkillPhysicalDataEntityOverride
 *
 */

const { SkillsSkillPhysicalDataEntity } = require(
    '../../../../generated-entities/entities/skills-skill-physical-data-entity'
);

class SkillsSkillPhysicalDataEntityOverride extends SkillsSkillPhysicalDataEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.properties.skill_id.alias = 'parent_skill';
        return config;
    }

}

module.exports.SkillsSkillPhysicalDataEntityOverride = SkillsSkillPhysicalDataEntityOverride;
