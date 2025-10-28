/**
 *
 * Reldens - SkillsSkillTargetEffectsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class SkillsSkillTargetEffectsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {
                dbType: 'int'
            },
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            property_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            operation: {
                type: 'reference',
                reference: 'operation_types',
                isRequired: true,
                dbType: 'int'
            },
            value: {
                isRequired: true,
                dbType: 'varchar'
            },
            minValue: {
                isRequired: true,
                dbType: 'varchar'
            },
            maxValue: {
                isRequired: true,
                dbType: 'varchar'
            },
            minProperty: {
                dbType: 'varchar'
            },
            maxProperty: {
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

module.exports.SkillsSkillTargetEffectsEntity = SkillsSkillTargetEffectsEntity;
