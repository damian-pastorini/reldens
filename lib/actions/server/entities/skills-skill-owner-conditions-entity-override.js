/**
 *
 * Reldens - SkillsSkillOwnerConditionsEntityOverride
 *
 * Entity override for skills owner conditions with property configuration.
 *
 */

const { SkillsSkillOwnerConditionsEntity } = require(
    '../../../../generated-entities/entities/skills-skill-owner-conditions-entity'
);

class SkillsSkillOwnerConditionsEntityOverride extends SkillsSkillOwnerConditionsEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.properties.skill_id.alias = 'parent_skill';
        return config;
    }

}

module.exports.SkillsSkillOwnerConditionsEntityOverride = SkillsSkillOwnerConditionsEntityOverride;
