/**
 *
 * Reldens - SkillsSkillAnimationsEntityOverride
 *
 */

const { SkillsSkillAnimationsEntity } = require(
    '../../../../generated-entities/entities/skills-skill-animations-entity'
);

class SkillsSkillAnimationsEntityOverride extends SkillsSkillAnimationsEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.listProperties.splice(config.listProperties.indexOf('classKey'), 1);
        return config;
    }

}

module.exports.SkillsSkillAnimationsEntityOverride = SkillsSkillAnimationsEntityOverride;
