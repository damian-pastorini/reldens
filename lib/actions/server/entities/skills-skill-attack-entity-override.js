/**
 *
 * Reldens - SkillsSkillAttackEntityOverride
 *
 * Entity override for skills attack with property configuration.
 *
 */

const { SkillsSkillAttackEntity } = require('../../../../generated-entities/entities/skills-skill-attack-entity');
const { sc } = require('@reldens/utils');

class SkillsSkillAttackEntityOverride extends SkillsSkillAttackEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.properties.skill_id.alias = 'parent_skill';
        config.listProperties = sc.removeFromArray(config.listProperties, [
            'allowEffectBelowZero',
            'applyDirectDamage',
            'dodgeFullEnabled',
            'dodgeOverAimSuccess',
            'damageAffected',
            'criticalAffected'
        ]);
        return config;
    }

}

module.exports.SkillsSkillAttackEntityOverride = SkillsSkillAttackEntityOverride;
