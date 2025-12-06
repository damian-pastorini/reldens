/**
 *
 * Reldens - SkillsLevelsSetEntityOverride
 *
 */

const { SkillsLevelsSetEntity } = require('../../../../generated-entities/entities/skills-levels-set-entity');

class SkillsLevelsSetEntityOverride extends SkillsLevelsSetEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 100;
        return config;
    }

}

module.exports.SkillsLevelsSetEntityOverride = SkillsLevelsSetEntityOverride;
