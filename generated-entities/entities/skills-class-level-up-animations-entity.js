/**
 *
 * Reldens - SkillsClassLevelUpAnimationsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsClassLevelUpAnimationsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            class_path_id: {
                type: 'reference',
                reference: 'skills_class_path',
                dbType: 'int'
            },
            level_id: {
                type: 'reference',
                reference: 'skills_levels',
                dbType: 'int'
            },
            animationData: {
                type: 'textarea',
                isRequired: true,
                dbType: 'text'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('animationData'), 1);
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.SkillsClassLevelUpAnimationsEntity = SkillsClassLevelUpAnimationsEntity;
