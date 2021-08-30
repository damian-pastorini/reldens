/**
 *
 * Reldens - SkillAttackEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { sc } = require('@reldens/utils');

class SkillAttackEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            skill_id: {
                type: 'reference',
                reference: 'skills_skill'
            },
            affectedProperty: {},
            allowEffectBelowZero: {},
            hitDamage: {},
            applyDirectDamage: {},
            attackProperties: {},
            defenseProperties: {},
            aimProperties: {},
            dodgeProperties: {},
            dodgeFullEnabled: {},
            dodgeOverAimSuccess: {},
            damageAffected: {},
            criticalAffected: {}
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

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.SkillAttackEntity = SkillAttackEntity;
