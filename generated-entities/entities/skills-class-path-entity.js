/**
 *
 * Reldens - SkillsClassPathEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class SkillsClassPathEntity extends EntityProperties
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
                dbType: 'varchar'
            },
            levels_set_id: {
                type: 'reference',
                reference: 'skills_levels_set',
                isRequired: true,
                dbType: 'int'
            },
            enabled: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
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

module.exports.SkillsClassPathEntity = SkillsClassPathEntity;
