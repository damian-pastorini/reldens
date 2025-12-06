/**
 *
 * Reldens - SkillsLevelsSetEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class SkillsLevelsSetEntity extends EntityProperties
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
                dbType: 'varchar'
            },
            [titleProperty]: {
                dbType: 'varchar'
            },
            autoFillRanges: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            autoFillExperienceMultiplier: {
                type: 'number',
                dbType: 'int'
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

module.exports.SkillsLevelsSetEntity = SkillsLevelsSetEntity;
