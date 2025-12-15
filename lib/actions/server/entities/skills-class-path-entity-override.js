/**
 *
 * Reldens - SkillsClassPathEntityOverride
 *
 * Entity override for skills class path with admin navigation configuration.
 *
 */

const { SkillsClassPathEntity } = require('../../../../generated-entities/entities/skills-class-path-entity');

class SkillsClassPathEntityOverride extends SkillsClassPathEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.navigationPosition = 110;
        return config;
    }

}

module.exports.SkillsClassPathEntityOverride = SkillsClassPathEntityOverride;
