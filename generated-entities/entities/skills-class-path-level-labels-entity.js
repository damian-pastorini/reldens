/**
 *
 * Reldens - SkillsClassPathLevelLabelsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsClassPathLevelLabelsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
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
                isRequired: true,
                dbType: 'int'
            },
            level_id: {
                type: 'reference',
                reference: 'skills_levels',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = propertiesKeys;
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.SkillsClassPathLevelLabelsEntity = SkillsClassPathLevelLabelsEntity;
