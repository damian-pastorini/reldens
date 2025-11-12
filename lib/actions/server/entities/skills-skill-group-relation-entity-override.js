/**
 *
 * Reldens - SkillsSkillGroupRelationEntityOverride
 *
 */

const { SkillsSkillGroupRelationEntity } = require(
    '../../../../generated-entities/entities/skills-skill-group-relation-entity'
);

class SkillsSkillGroupRelationEntityOverride extends SkillsSkillGroupRelationEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config = this.updateProperty(config, 'skill_id', 'alias', 'parent_skill');
        config = this.updateProperty(config, 'group_id', 'alias', 'parent_group');
        return config;
    }

    static updateProperty(config, propertyName, propertyField, propertyValue)
    {
        config.properties[propertyName][propertyField] = propertyValue;
        return config;
    }

}

module.exports.SkillsSkillGroupRelationEntityOverride = SkillsSkillGroupRelationEntityOverride;
