/**
 *
 * Reldens - Skills - SkillsGenerator
 *
 * Generates skill data structures and instances from database models.
 *
 */

const { ModifiersGenerator } = require('./modifiers-generator');
const { ConditionsGenerator } = require('./conditions-generator');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class SkillsGenerator
{

    /**
     * @param {Array} skillsModels
     * @param {Object} skillsClasses
     * @param {EventsManager} events
     * @returns {Object}
     */
    static dataFromSkillsModelsWithClasses(skillsModels, skillsClasses, events)
    {
        if(0 === skillsModels.length){
            return {};
        }
        let skillsList = {};
        for(let skillModel of skillsModels){
            let skillClass = sc.hasOwn(skillsClasses, skillModel.type) ? skillsClasses[skillModel.type] : false;
            if(!skillClass){
                ErrorManager.error('Undefined skill type in skillsList:' + skillModel.type);
            }
            // force to use the same events manager instance used on the main package:
            skillModel.events = events;
            this.enrichWithAttackData(skillModel);
            this.enrichWithPhysicalData(skillModel);
            skillsList[skillModel.key] = {class: skillClass, data: skillModel};
        }
        return {skillsModels, skillsList};
    }

    /**
     * @param {Array} levelSkillsModels
     * @param {Object} owner
     * @param {string} ownerIdProperty
     * @param {Object} skillsClassesList
     * @param {EventsManager} events
     * @returns {Object}
     */
    static skillsByLevelsFromSkillsModels(levelSkillsModels, owner, ownerIdProperty, skillsClassesList, events)
    {
        if(!sc.isArray(levelSkillsModels) || 0 === levelSkillsModels.length){
            return {};
        }
        let skillsByLevel = {};
        for(let skillData of levelSkillsModels){
            //Logger.debug('Skill data:', skillData);
            let skillLevel = skillData['related_skills_levels'];
            if (!skillLevel){
                Logger.debug('Skill level is not defined.', skillLevel);
                continue;
            }
            let levelKey = Number(skillLevel.key);
            if(!sc.hasOwn(skillsByLevel, levelKey)){
                skillsByLevel[levelKey] = {};
            }
            let skillModel = skillData.related_skills_skill;
            skillModel.owner = owner;
            skillModel.ownerIdProperty = ownerIdProperty;
            skillModel.events = events;
            this.enrichWithAttackData(skillModel);
            this.enrichWithPhysicalData(skillModel);
            skillModel.ownerConditions = ConditionsGenerator.fromConditionsModels(
                skillModel['related_skills_skill_owner_conditions']
            );
            // @NOTE: skill effects are modifiers that will affect the skill owner or target.
            skillModel.ownerEffects = ModifiersGenerator.fromModifiersModels(
                skillModel['related_skills_skill_owner_effects']
            );
            skillModel.targetEffects = ModifiersGenerator.fromModifiersModels(
                skillModel['related_skills_skill_target_effects']
            );
            skillsByLevel[levelKey][skillModel.key] = new skillsClassesList[skillModel.key]['class'](skillModel);
        }
        return skillsByLevel;
    }

    /**
     * @param {Object} skillModel
     */
    static enrichWithPhysicalData(skillModel)
    {
        if(!sc.isTrue(skillModel, 'related_skills_skill_physical_data')){
            return;
        }
        // @TODO - BETA - Make physical properties configurable.
        let physicalProps = [
            'magnitude',
            'objectWidth',
            'objectHeight',
            'validateTargetOnHit'
        ];
        for(let i of physicalProps){
            skillModel[i] = skillModel['related_skills_skill_physical_data'][i];
        }
    }

    /**
     * @param {Object} skillModel
     */
    static enrichWithAttackData(skillModel)
    {
        if(!sc.isTrue(skillModel, 'related_skills_skill_attack')){
            return;
        }
        skillModel['attackProperties'] = skillModel['related_skills_skill_attack'].attackProperties?.split(',') || [];
        skillModel['defenseProperties'] = skillModel['related_skills_skill_attack'].defenseProperties?.split(',') || [];
        skillModel['aimProperties'] = skillModel['related_skills_skill_attack'].aimProperties?.split(',') || [];
        skillModel['dodgeProperties'] = skillModel['related_skills_skill_attack'].dodgeProperties?.split(',') || [];
        let attackProps = [
            'affectedProperty',
            'allowEffectBelowZero',
            'hitDamage',
            'applyDirectDamage',
            'dodgeFullEnabled',
            'dodgeOverAimSuccess',
            'damageAffected',
            'criticalAffected'
        ];
        for(let i of attackProps){
            skillModel[i] = skillModel['related_skills_skill_attack'][i];
        }
    }
}

module.exports.SkillsGenerator = SkillsGenerator;
