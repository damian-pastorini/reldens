/**
 *
 * Reldens - SkillsSkillGroupRelationEntityOverride
 *
 * Entity override for skills group relations with property configuration.
 *
 */

const { SkillsSkillGroupRelationEntity } = require(
    '../../../../generated-entities/entities/skills-skill-group-relation-entity'
);

class SkillsSkillGroupRelationEntityOverride extends SkillsSkillGroupRelationEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config = this.updateProperty(config, 'skill_id', 'alias', 'parent_skill');
        config = this.updateProperty(config, 'group_id', 'alias', 'parent_group');
        return config;
    }

    /**
     * @param {Object} config
     * @param {string} propertyName
     * @param {string} propertyField
     * @param {string} propertyValue
     * @returns {Object}
     */
    static updateProperty(config, propertyName, propertyField, propertyValue)
    {
        config.properties[propertyName][propertyField] = propertyValue;
        return config;
    }

}

module.exports.SkillsSkillGroupRelationEntityOverride = SkillsSkillGroupRelationEntityOverride;
