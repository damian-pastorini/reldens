/**
 *
 * Reldens - DataLoader
 *
 */

const { TypeAttack, TypeEffect, TypePhysicalAttack, TypePhysicalEffect } = require('./skills/types');
const { SkillConst} = require('@reldens/skills');
const { Logger, sc } = require('@reldens/utils');

class DataLoader
{

    static async enrichConfig(configProcessor, skillsModelsManager, dataServer)
    {
        await this.prepareConfigProcessor(configProcessor);
        await this.loadSkillsFullList(configProcessor, skillsModelsManager);
        await this.loadGroupsFullList(configProcessor, dataServer);
        await this.loadClassPathFullList(configProcessor, skillsModelsManager);
        await this.appendSkillsAnimations(configProcessor, dataServer);
        await this.appendLevelsAnimations(configProcessor, dataServer);
    }

    static async prepareConfigProcessor(configProcessor)
    {
        if(!sc.hasOwn(configProcessor, 'skills')){
            configProcessor.skills = {skillsList: {}};
        }
        if(!sc.hasOwn(configProcessor.skills, 'defaultSkills')){
            configProcessor.skills.defaultSkills = {};
        }
        configProcessor.skills.defaultSkills[SkillConst.SKILL.TYPE.ATTACK] = TypeAttack;
        configProcessor.skills.defaultSkills[SkillConst.SKILL.TYPE.EFFECT] = TypeEffect;
        configProcessor.skills.defaultSkills[SkillConst.SKILL.TYPE.PHYSICAL_ATTACK] = TypePhysicalAttack;
        configProcessor.skills.defaultSkills[SkillConst.SKILL.TYPE.PHYSICAL_EFFECT] = TypePhysicalEffect;
        return configProcessor;
    }

    static async loadSkillsFullList(configProcessor, skillsModelsManager)
    {
        let skillsClasses = configProcessor.getWithoutLogs('server/customClasses/skills/skillsList', {});
        // defined in this same class on the reldens.serverReady listener:
        Object.assign(skillsClasses, configProcessor.skills.defaultSkills);
        configProcessor.skills = await skillsModelsManager.generateSkillsDataFromModels(skillsClasses);
    }

    static async loadGroupsFullList(configProcessor, dataServer)
    {
        let groupsModels = await dataServer.getEntity('skillsGroups').loadAll();
        if(0 < groupsModels.length){
            configProcessor.skills.groups = groupsModels;
        }
    }

    static async loadClassPathFullList(configProcessor, skillsModelsManager)
    {
        configProcessor.skills.classPaths = await skillsModelsManager.generateClassPathInstances(
            configProcessor.getWithoutLogs('server/customClasses/skills/classPath', {})
        );
        //Logger.debug('Config Processor skills class paths:', configProcessor.skills.classPaths);
    }

    static async appendSkillsAnimations(config, dataServer)
    {
        let animationsModels = await dataServer.getEntity('skillsSkillAnimations').loadAllWithRelations();
        if(0 === animationsModels.length){
            Logger.debug('None animations models found.');
            return config.client.skills.animations;
        }
        for(let skillAnim of animationsModels){
            let animationData = sc.toJson(skillAnim.animationData, {});
            let customDataJson = sc.toJson(skillAnim.related_skills_skill.customData, {});
            if(sc.hasOwn(customDataJson, 'blockMovement')){
                animationData.blockMovement = customDataJson.blockMovement;
            }
            config.client.skills.animations[skillAnim.related_skills_skill.key+'_'+skillAnim.key] = {
                skillId: skillAnim.skill_id,
                skillKey: skillAnim.related_skills_skill.key,
                key: skillAnim.key,
                class: skillAnim.classKey,
                animationData
            }
        }
        return config.client.skills.animations;
    }

    static async appendLevelsAnimations(config, dataServer)
    {
        if(!sc.hasOwn(config.client, 'levels')){
            config.client.levels = {};
        }
        if(!sc.hasOwn(config.client.levels, 'animations')){
            config.client.levels.animations = {};
        }
        let levelsAnimationsModels = await dataServer.getEntity('skillsClassLevelUpAnimations').loadAllWithRelations();
        if(0 === levelsAnimationsModels.length){
            return config.client.levels.animations;
        }
        for(let levelAnimation of levelsAnimationsModels){
            let animationData = sc.toJson(levelAnimation.animationData, {});
            let animationKey = this.generateAnimationKey(levelAnimation);
            config.client.levels.animations[animationKey] = {
                key: animationKey,
                levelId: sc.get(levelAnimation.related_skills_levels, 'id', null),
                classKey: sc.get(levelAnimation.related_skills_class_path, 'key', null),
                animationData
            }
        }
        return config.client.levels.animations;
    }

    static generateAnimationKey(levelAnimation)
    {
        let levelKey = sc.get(levelAnimation.related_skills_levels, 'id', '');
        let classPathKey = sc.get(levelAnimation.related_skills_class_path, 'key', '');
        if('' === levelKey && '' === classPathKey){
            return 'level_default';
        }
        let animationKey = 'level';
        if('' !== classPathKey){
            classPathKey = '_'+classPathKey;
        }
        if('' !== levelKey){
            levelKey = '_'+levelKey;
        }
        return animationKey+classPathKey+levelKey;
    }

}

module.exports.DataLoader = DataLoader;
