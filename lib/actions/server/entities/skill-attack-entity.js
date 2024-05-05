/**
 *
 * Reldens - SkillAttackEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class SkillAttackEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill',
                isRequired: true
            },
            affectedProperty: {
                isRequired: true
            },
            allowEffectBelowZero: {
                type: 'boolean',
                isRequired: true
            },
            hitDamage: {
                type: 'number',
                isRequired: true
            },
            applyDirectDamage: {
                type: 'boolean',
                isRequired: true
            },
            attackProperties: {},
            defenseProperties: {},
            aimProperties: {},
            dodgeProperties: {},
            dodgeFullEnabled: {
                type: 'boolean',
                isRequired: true
            },
            dodgeOverAimSuccess: {
                type: 'boolean',
                isRequired: true
            },
            damageAffected: {
                type: 'boolean',
                isRequired: true
            },
            criticalAffected: {
                type: 'boolean',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'allowEffectBelowZero',
            'applyDirectDamage',
            'dodgeFullEnabled',
            'dodgeOverAimSuccess',
            'damageAffected',
            'criticalAffected'
        ]);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.SkillAttackEntity = SkillAttackEntity;
