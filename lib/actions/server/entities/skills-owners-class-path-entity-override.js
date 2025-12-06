/**
 *
 * Reldens - SkillsOwnersClassPathEntityOverride
 *
 */

const { SkillsOwnersClassPathEntity } = require(
    '../../../../generated-entities/entities/skills-owners-class-path-entity'
);

class SkillsOwnersClassPathEntityOverride extends SkillsOwnersClassPathEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        // config.showProperties.class_path_id.alias = 'class_path_owner';
        // config.editProperties.class_path_id.alias = 'class_path_owner';
        // config.listProperties.class_path_id.alias = 'class_path_owner';
        // config.filterProperties.class_path_id.alias = 'class_path_owner';
        config.properties.class_path_id.alias = 'class_path_owner';
        config.navigationPosition = 990;
        return config;
    }

}

module.exports.SkillsOwnersClassPathEntityOverride = SkillsOwnersClassPathEntityOverride;
