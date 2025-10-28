/**
 *
 * Reldens - SkillsGroupsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsGroupsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'label';
        let properties = {
            id: {
                dbType: 'int'
            },
            key: {
                isRequired: true,
                dbType: 'varchar'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            description: {
                isRequired: true,
                dbType: 'varchar'
            },
            sort: {
                type: 'number',
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

module.exports.SkillsGroupsEntity = SkillsGroupsEntity;
