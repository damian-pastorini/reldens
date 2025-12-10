/**
 *
 * Reldens - SkillsSkillEntityOverride
 *
 * Entity override for skills with property and navigation configuration.
 *
 */

const { SkillsSkillEntity } = require('../../../../generated-entities/entities/skills-skill-entity');
const { sc } = require('@reldens/utils');

class SkillsSkillEntityOverride extends SkillsSkillEntity
{

    /**
     * @param {Object} extraProps
     * @returns {Object}
     */
    static propertiesConfig(extraProps)
    {
        let config = super.propertiesConfig(extraProps);
        config.listProperties = sc.removeFromArray(config.listProperties, [
            'autoValidation',
            'rangeAutomaticValidation',
            'rangePropertyX',
            'rangePropertyY',
            'rangeTargetPropertyX',
            'rangeTargetPropertyY',
            'allowSelfTarget',
            'criticalChance',
            'criticalMultiplier',
            'criticalFixedValue'
        ]);
        config.navigationPosition = 200;
        return config;
    }

}

module.exports.SkillsSkillEntityOverride = SkillsSkillEntityOverride;
