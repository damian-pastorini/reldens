/**
 *
 * Reldens - SkillsLevelsSetEntityOverride
 *
 * Entity override for skills levels set with admin navigation configuration.
 *
 */

const { SkillsLevelsSetEntity } = require('../../../../generated-entities/entities/skills-levels-set-entity');

class SkillsLevelsSetEntityOverride extends SkillsLevelsSetEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 100;
        return config;
    }

}

module.exports.SkillsLevelsSetEntityOverride = SkillsLevelsSetEntityOverride;
