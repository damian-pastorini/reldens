/**
 *
 * Reldens - SkillsOwnersClassPathEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsOwnersClassPathEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            class_path_id: {
                type: 'reference',
                reference: 'skills_class_path',
                isRequired: true,
                dbType: 'int'
            },
            owner_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true,
                dbType: 'int'
            },
            currentLevel: {
                type: 'number',
                dbType: 'bigint'
            },
            currentExp: {
                type: 'number',
                dbType: 'bigint'
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
            ...extraProps
        };
    }

}

module.exports.SkillsOwnersClassPathEntity = SkillsOwnersClassPathEntity;
