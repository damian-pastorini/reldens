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
                alias: 'parent_skill',
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

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties = sc.removeFromArray(listProperties, [
            'allowEffectBelowZero',
            'applyDirectDamage',
            'dodgeFullEnabled',
            'dodgeOverAimSuccess',
            'damageAffected',
            'criticalAffected'
        ]);
        editProperties.splice(editProperties.indexOf('id'), 1);

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

module.exports.SkillAttackEntity = SkillAttackEntity;
