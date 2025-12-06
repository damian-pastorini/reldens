/**
 *
 * Reldens - SkillsClassLevelUpAnimationsEntityOverride
 *
 */

const { SkillsClassLevelUpAnimationsEntity } = require(
    '../../../../generated-entities/entities/skills-class-level-up-animations-entity'
);

class SkillsClassLevelUpAnimationsEntityOverride extends SkillsClassLevelUpAnimationsEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config = this.updateProperty(config, 'class_path_id', 'alias', 'class_path');
        config = this.updateProperty(config, 'level_id', 'alias', 'level');
        return config;
    }

    static updateProperty(config, propertyName, propertyField, propertyValue)
    {
        // config.showProperties[propertyName][propertyField] = propertyValue;
        // config.editProperties[propertyName][propertyField] = propertyValue;
        // config.listProperties[propertyName][propertyField] = propertyValue;
        // config.filterProperties[propertyName][propertyField] = propertyValue;
        config.properties[propertyName][propertyField] = propertyValue;
        return config;
    }

}

module.exports.SkillsClassLevelUpAnimationsEntityOverride = SkillsClassLevelUpAnimationsEntityOverride;
