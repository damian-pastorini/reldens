/**
 *
 * Reldens - SkillsLevelsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsLevelsEntity extends EntityProperties
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
            key: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            required_experience: {
                type: 'number',
                dbType: 'bigint'
            },
            level_set_id: {
                type: 'reference',
                reference: 'skills_levels_set',
                isRequired: true,
                dbType: 'int'
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

module.exports.SkillsLevelsEntity = SkillsLevelsEntity;
