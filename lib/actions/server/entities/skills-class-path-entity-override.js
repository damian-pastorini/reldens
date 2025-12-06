/**
 *
 * Reldens - SkillsClassPathEntityOverride
 *
 */

const { SkillsClassPathEntity } = require('../../../../generated-entities/entities/skills-class-path-entity');

class SkillsClassPathEntityOverride extends SkillsClassPathEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 110;
        return config;
    }

}

module.exports.SkillsClassPathEntityOverride = SkillsClassPathEntityOverride;
