/**
 *
 * Reldens - SkillsSkillModel
 *
 */

class SkillsSkillModel
{

    constructor(id, key, type, label, autoValidation, skillDelay, castTime, usesLimit, range, rangeAutomaticValidation, rangePropertyX, rangePropertyY, rangeTargetPropertyX, rangeTargetPropertyY, allowSelfTarget, criticalChance, criticalMultiplier, criticalFixedValue, customData, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.type = type;
        this.label = label;
        this.autoValidation = autoValidation;
        this.skillDelay = skillDelay;
        this.castTime = castTime;
        this.usesLimit = usesLimit;
        this.range = range;
        this.rangeAutomaticValidation = rangeAutomaticValidation;
        this.rangePropertyX = rangePropertyX;
        this.rangePropertyY = rangePropertyY;
        this.rangeTargetPropertyX = rangeTargetPropertyX;
        this.rangeTargetPropertyY = rangeTargetPropertyY;
        this.allowSelfTarget = allowSelfTarget;
        this.criticalChance = criticalChance;
        this.criticalMultiplier = criticalMultiplier;
        this.criticalFixedValue = criticalFixedValue;
        this.customData = customData;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'skills_skill';
    }
    

    static get relationTypes()
    {
        return {
            objects_skills: 'many',
            skills_class_path_level_skills: 'many',
            skills_skill_type: 'one',
            skills_skill_animations: 'many',
            skills_skill_attack: 'one',
            skills_skill_group_relation: 'one',
            skills_skill_owner_conditions: 'many',
            skills_skill_owner_effects: 'many',
            skills_skill_physical_data: 'one',
            skills_skill_target_effects: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_skill_type': 'skills_skill_type',
            'related_objects_skills': 'objects_skills',
            'related_skills_class_path_level_skills': 'skills_class_path_level_skills',
            'related_skills_skill_animations': 'skills_skill_animations',
            'related_skills_skill_attack': 'skills_skill_attack',
            'related_skills_skill_group_relation': 'skills_skill_group_relation',
            'related_skills_skill_owner_conditions': 'skills_skill_owner_conditions',
            'related_skills_skill_owner_effects': 'skills_skill_owner_effects',
            'related_skills_skill_physical_data': 'skills_skill_physical_data',
            'related_skills_skill_target_effects': 'skills_skill_target_effects'
        };
    }
}

module.exports.SkillsSkillModel = SkillsSkillModel;
