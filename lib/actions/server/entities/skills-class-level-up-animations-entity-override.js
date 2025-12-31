/**
 *
 * Reldens - SkillsClassLevelUpAnimationsEntityOverride
 *
 * Entity override for skills class level up animations with property alias configuration.
 *
 */

const { SkillsClassLevelUpAnimationsEntity } = require(
    '../../../../generated-entities/entities/skills-class-level-up-animations-entity'
);

class SkillsClassLevelUpAnimationsEntityOverride extends SkillsClassLevelUpAnimationsEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config = this.updateProperty(config, 'class_path_id', 'alias', 'class_path');
        config = this.updateProperty(config, 'level_id', 'alias', 'level');
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

module.exports.SkillsClassLevelUpAnimationsEntityOverride = SkillsClassLevelUpAnimationsEntityOverride;
