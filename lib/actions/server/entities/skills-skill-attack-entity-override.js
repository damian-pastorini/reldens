/**
 *
 * Reldens - SkillsSkillAttackEntityOverride
 *
 */

const { SkillsSkillAttackEntity } = require('../../../../generated-entities/entities/skills-skill-attack-entity');
const { sc } = require('@reldens/utils');

class SkillsSkillAttackEntityOverride extends SkillsSkillAttackEntity
{

    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        // config.showProperties.skill_id.alias = 'parent_skill';
        // config.editProperties.skill_id.alias = 'parent_skill';
        // config.listProperties.skill_id.alias = 'parent_skill';
        // config.filterProperties.skill_id.alias = 'parent_skill';
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
