/**
 *
 * Reldens - SkillsSkillAttackEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class SkillsSkillAttackEntity extends EntityProperties
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
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                isRequired: true,
                dbType: 'int'
            },
            affectedProperty: {
                isRequired: true,
                dbType: 'varchar'
            },
            allowEffectBelowZero: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            hitDamage: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            applyDirectDamage: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            attackProperties: {
                type: 'textarea',
                dbType: 'text'
            },
            defenseProperties: {
                type: 'textarea',
                dbType: 'text'
            },
            aimProperties: {
                type: 'textarea',
                dbType: 'text'
            },
            dodgeProperties: {
                type: 'textarea',
                dbType: 'text'
            },
            dodgeFullEnabled: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            dodgeOverAimSuccess: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            damageAffected: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            criticalAffected: {
                type: 'boolean',
                dbType: 'tinyint'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = sc.removeFromArray([...propertiesKeys], ['attackProperties', 'defenseProperties', 'aimProperties', 'dodgeProperties']);
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

module.exports.SkillsSkillAttackEntity = SkillsSkillAttackEntity;
