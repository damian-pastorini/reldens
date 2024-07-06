/**
 *
 * Reldens - ClassPathLevelSkillsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ClassPathLevelSkillsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            class_path_id: {
                type: 'reference',
                reference: 'skills_class_path',
                alias: 'class_path',
                isRequired: true
            },
            level_id: {
                type: 'reference',
                reference: 'skills_levels',
                alias: 'class_path_level',
                isRequired: true
            },
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                alias: 'class_path_level_skill',
                isRequired: true
            },
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.ClassPathLevelSkillsEntity = ClassPathLevelSkillsEntity;
