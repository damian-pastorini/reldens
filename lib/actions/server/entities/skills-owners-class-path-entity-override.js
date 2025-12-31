/**
 *
 * Reldens - SkillsOwnersClassPathEntityOverride
 *
 * Entity override for skills owners class path with property configuration.
 *
 */

const { SkillsOwnersClassPathEntity } = require(
    '../../../../generated-entities/entities/skills-owners-class-path-entity'
);

class SkillsOwnersClassPathEntityOverride extends SkillsOwnersClassPathEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.properties.class_path_id.alias = 'class_path_owner';
        config.navigationPosition = 990;
        return config;
    }

}

module.exports.SkillsOwnersClassPathEntityOverride = SkillsOwnersClassPathEntityOverride;
