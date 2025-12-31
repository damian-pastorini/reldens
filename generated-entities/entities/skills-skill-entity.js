/**
 *
 * Reldens - SkillsSkillEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class SkillsSkillEntity extends EntityProperties
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
                isRequired: true,
                dbType: 'varchar'
            },
            type: {
                type: 'reference',
                reference: 'skills_skill_type',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                dbType: 'varchar'
            },
            autoValidation: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            skillDelay: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            castTime: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            usesLimit: {
                type: 'number',
                dbType: 'int'
            },
            range: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            rangeAutomaticValidation: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            rangePropertyX: {
                isRequired: true,
                dbType: 'varchar'
            },
            rangePropertyY: {
                isRequired: true,
                dbType: 'varchar'
            },
            rangeTargetPropertyX: {
                dbType: 'varchar'
            },
            rangeTargetPropertyY: {
                dbType: 'varchar'
            },
            allowSelfTarget: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            criticalChance: {
                type: 'number',
                dbType: 'int'
            },
            criticalMultiplier: {
                type: 'number',
                dbType: 'int'
            },
            criticalFixedValue: {
                type: 'number',
                dbType: 'int'
            },
            customData: {
                type: 'textarea',
                dbType: 'text'
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
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('customData'), 1);
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

module.exports.SkillsSkillEntity = SkillsSkillEntity;
