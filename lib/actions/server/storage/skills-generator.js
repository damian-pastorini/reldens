/**
 *
 * Reldens - Skills - SkillsGenerator
 *
 */

const { ModifiersGenerator } = require('./modifiers-generator');
const { ConditionsGenerator } = require('./conditions-generator');
const { ErrorManager, sc } = require('@reldens/utils');

class SkillsGenerator
{

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

    static skillsByLevelsFromSkillsModels(levelSkillsModels, owner, ownerIdProperty, skillsClassesList, events)
    {
        if(!sc.isArray(levelSkillsModels) || 0 === levelSkillsModels.length){
            return {};
        }
        let skillsByLevel = {};
        for(let skillData of levelSkillsModels){
            let levelKey = parseInt(skillData['class_path_level'].key);
            if(!sc.hasOwn(skillsByLevel, levelKey)){
                skillsByLevel[levelKey] = {};
            }
            let skillModel = skillData.class_path_level_skill;
            skillModel.owner = owner;
            skillModel.ownerIdProperty = ownerIdProperty;
            skillModel.events = events;
            this.enrichWithAttackData(skillModel);
            this.enrichWithPhysicalData(skillModel);
            skillModel.ownerConditions = ConditionsGenerator.fromConditionsModels(skillModel['skill_owner_conditions']);
            // @NOTE: skill effects are modifiers that will affect the skill owner or target.
            skillModel.ownerEffects = ModifiersGenerator.fromModifiersModels(skillModel['skill_owner_effects']);
            skillModel.targetEffects = ModifiersGenerator.fromModifiersModels(skillModel['skill_target_effects']);
            skillsByLevel[levelKey][skillModel.key] = new skillsClassesList[skillModel.key]['class'](skillModel);
        }
        return skillsByLevel;
    }

    static enrichWithPhysicalData(skillModel)
    {
        if(!sc.isTrue(skillModel, 'skill_physical_data')){
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
            skillModel[i] = skillModel['skill_physical_data'][i];
        }
    }

    static enrichWithAttackData(skillModel)
    {
        if(!sc.isTrue(skillModel, 'skill_attack')){
            return;
        }
        skillModel['attackProperties'] = skillModel['skill_attack'].attackProperties?.split(',') || [];
        skillModel['defenseProperties'] = skillModel['skill_attack'].defenseProperties?.split(',') || [];
        skillModel['aimProperties'] = skillModel['skill_attack'].aimProperties?.split(',') || [];
        skillModel['dodgeProperties'] = skillModel['skill_attack'].dodgeProperties?.split(',') || [];
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
            skillModel[i] = skillModel['skill_attack'][i];
        }
    }
}

module.exports.SkillsGenerator = SkillsGenerator;
