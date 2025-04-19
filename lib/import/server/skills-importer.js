/**
 *
 * Reldens - SkillsImporter
 *
 */

const { SkillDataFactory } = require('../../actions/factories/skill-data-factory');
const { Logger, sc } = require('@reldens/utils');

class SkillsImporter
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer');
        this.defaults = {};
        this.operationTypes = {};
        this.skillTypes = {};
        this.setupRepositories();
    }

    setupRepositories()
    {
        if(!this.dataServer){
            Logger.error('Data server not available on Skills Importer.');
            return false;
        }
        this.skillRepository = this.dataServer.getEntity('skill');
        this.skillAttackRepository = this.dataServer.getEntity('skillAttack');
        this.skillTargetEffectsRepository = this.dataServer.getEntity('skillTargetEffects');
        this.skillPhysicalDataRepository = this.dataServer.getEntity('skillPhysicalData');
        this.skillOwnerConditionsRepository = this.dataServer.getEntity('skillOwnerConditions');
        this.skillOwnerEffectsRepository = this.dataServer.getEntity('skillOwnerEffects');
        this.skillAnimationsRepository = this.dataServer.getEntity('animations');
        this.classPathLevelSkillsRepository = this.dataServer.getEntity('classPathLevelSkills');
        this.levelsRepository = this.dataServer.getEntity('level');
        this.classPathRepository = this.dataServer.getEntity('classPath');
        this.objectsRepository = this.dataServer.getEntity('objects');
        this.objectsSkillsRepository = this.dataServer.getEntity('objectsSkills');
        this.targetOptionsRepository = this.dataServer.getEntity('targetOptions');
        this.operationTypesRepository = this.dataServer.getEntity('operationTypes');
        this.skillTypeRepository = this.dataServer.getEntity('skillType');
    }

    async import(data)
    {
        // @TODO - BETA - Implement error handling and errorMessages.
        Logger.info('Skill import starting...');
        if(!data){
            Logger.critical('Import data not found.');
            return false;
        }
        this.options = sc.get(data, 'options', {
            removeAll: false,
            override: false,
            update: false
        });
        this.defaults = sc.get(data, 'defaults', {});
        this.skills = sc.get(data, 'skills', {});
        if(0 === Object.keys(this.skills).length){
            Logger.critical('Skills data not found.', data);
            return false;
        }
        await this.loadTargetOptions();
        await this.loadOperationTypes();
        await this.loadSkillTypes();
        await this.loadClassPaths();
        await this.removeAllSKills();
        for(let key of Object.keys(this.skills)){
            let existentSkill = await this.loadExistentSkill(key);
            if(!this.options.override && !this.options.update && existentSkill){
                continue;
            }
            await this.upsertSkill(key, existentSkill);
        }
        Logger.info('Skill import finished.');
        return true;
    }

    async upsertSkill(key, existentSkill)
    {
        try {
            let skillRawData = this.skills[key];
            let skillsData = (new SkillDataFactory()).mapData(key, skillRawData, this.defaults);
            skillsData.type = this.skillTypes[skillRawData.typeData.key].id;
            if(this.options.update && existentSkill){
                await this.updateSkill(existentSkill, skillsData);
                Logger.debug('Updated skill: "' + key + '".');
                return;
            }
            if(this.options.override && existentSkill){
                await this.deleteSkill(existentSkill.id);
            }
            await this.createSkill(key, skillsData);
            Logger.debug('Created skill: "' + key + '".');
        } catch (error){
            Logger.warning('Create skill error.', error.message, {key, existentSkill});
        }
    }

    async loadTargetOptions()
    {
        let targetOptionsModels = await this.targetOptionsRepository.loadAll();
        this.defaults.targetOptions = {};
        for(let targetOption of targetOptionsModels){
            this.defaults.targetOptions[targetOption.target_key] = targetOption;
        }
    }

    async loadOperationTypes()
    {
        let operationTypesModels = await this.operationTypesRepository.loadAll();
        for(let operationType of operationTypesModels){
            this.operationTypes[operationType.key] = operationType;
        }
    }

    async loadSkillTypes()
    {
        let skillTypesModels = await this.skillTypeRepository.loadAll();
        for(let skillType of skillTypesModels){
            this.skillTypes[skillType.key] = skillType;
        }
    }

    async loadClassPaths()
    {
        let classPathsModels = await this.classPathRepository.loadAll();
        this.defaults.classPaths = {};
        for(let classPath of classPathsModels){
            classPath.relatedLevels = await this.levelsRepository.loadBy('level_set_id', classPath.levels_set_id);
            this.defaults.classPaths[classPath.key] = classPath;
        }
    }

    async updateSkill(existentSkill, skillsData)
    {
        await this.updateSkillAssociations(skillsData, existentSkill);
        await this.skillRepository.updateById(existentSkill.id, skillsData.skillBaseData());
    }

    async createSkill(key, skillsData)
    {
        let existentSkill = await this.skillRepository.create(skillsData.skillBaseData());
        skillsData.clearPrevious = ['targetEffects', 'ownerEffects', 'ownerConditions'];
        await this.updateSkillAssociations(skillsData, existentSkill);
    }

    async updateSkillAssociations(skillsData, existentSkill)
    {
        await this.updateClassPathLevelSkill(skillsData, existentSkill);
        await this.updateObjectSkill(skillsData, existentSkill);
        await this.updateSkillAttack(skillsData, existentSkill);
        await this.updateSkillPhysicalData(skillsData, existentSkill);
        await this.updateTargetEffects(skillsData, existentSkill);
        await this.updateOwnerEffects(skillsData, existentSkill);
        await this.updateOwnerConditions(skillsData, existentSkill);
        await this.updateAnimations(skillsData, existentSkill);
    }

    async updateSkillPhysicalData(skillsData, existentSkill)
    {
        if(!skillsData.physicalData){
            return false;
        }
        let existentPhysicalData = await this.skillPhysicalDataRepository.loadOneBy('skill_id', existentSkill.id);
        if(!existentPhysicalData){
            skillsData.physicalData.skill_id = existentSkill.id;
            return this.skillPhysicalDataRepository.create(skillsData.physicalData);
        }
        return this.skillPhysicalDataRepository.updateBy('skill_id', existentSkill.id, skillsData.physicalData);
    }

    async updateSkillAttack(skillsData, existentSkill)
    {
        if(!skillsData.attack){
            return false;
        }
        let existentAttack = await this.skillAttackRepository.loadOneBy('skill_id', existentSkill.id);
        if(!existentAttack){
            skillsData.attack.skill_id = existentSkill.id;
            return this.skillAttackRepository.create(skillsData.attack);
        }
        return await this.skillAttackRepository.updateBy('skill_id', existentSkill.id, skillsData.attack);
    }

    async updateTargetEffects(skillsData, existentSkill)
    {
        if(-1 !== skillsData.clearPrevious.indexOf('targetEffects')){
            await this.skillTargetEffectsRepository.delete({skill_id: existentSkill.id});
        }
        if(0 < skillsData.targetEffects.length){
            for(let targetEffect of skillsData.targetEffects){
                let operation = this.operationTypes[targetEffect.operationKey];
                if(!operation){
                    Logger.warning('Operation not found by key: "' + targetEffect.operationKey + '".');
                    continue;
                }
                targetEffect.skill_id = existentSkill.id;
                targetEffect.operation = operation.key;
                delete targetEffect['operationKey'];
                delete targetEffect['propertyKey'];
                await this.skillTargetEffectsRepository.create(targetEffect);
            }
        }
    }

    async updateOwnerEffects(skillsData, existentSkill)
    {
        if(-1 !== skillsData.clearPrevious.indexOf('ownerEffects')){
            await this.skillOwnerEffectsRepository.delete({skill_id: existentSkill.id});
        }
        if(0 === skillsData.ownerEffects.length){
            return;
        }
        for(let ownerEffect of skillsData.ownerEffects){
            let operation = this.operationTypes[ownerEffect.operationKey];
            if(!operation){
                Logger.warning('Operation not found by key: "' + ownerEffect.operationKey + '".');
                continue;
            }
            ownerEffect.skill_id = existentSkill.id;
            ownerEffect.operation = operation.key;
            delete ownerEffect['operationKey'];
            delete ownerEffect['propertyKey'];
            await this.skillOwnerEffectsRepository.create(ownerEffect);
        }
    }

    async updateAnimations(skillsData, existentSkill)
    {
        if(-1 !== skillsData.clearPrevious.indexOf('animations')){
            await this.skillAnimationsRepository.delete({skill_id: existentSkill.id});
        }
        if(0 === skillsData.animations.length){
            return;
        }
        for(let animation of skillsData.animations){
            animation.skill_id = existentSkill.id;
            let existentAnimation = await this.skillAnimationsRepository.loadOne({
                skill_id: existentSkill.id,
                key: animation.key
            });
            if(existentAnimation){
                await this.skillAnimationsRepository.updateBy('skill_id', existentSkill.id, animation);
                continue;
            }
            try {
                await this.skillAnimationsRepository.create(animation);
            } catch (error) {
                Logger.debug('Create skill animation error.', error, animation, skillsData, existentSkill);
            }
        }
    }

    async updateOwnerConditions(skillsData, existentSkill)
    {
        if(-1 !== skillsData.clearPrevious.indexOf('ownerConditions')){
            await this.skillOwnerConditionsRepository.delete({skill_id: Number(existentSkill.id)});
            Logger.debug('Cleared previous skill owner conditions.', existentSkill.id);
        }
        if(0 === skillsData.ownerConditions.length){
            return;
        }
        for(let ownerCondition of skillsData.ownerConditions){
            ownerCondition.skill_id = existentSkill.id;
            delete ownerCondition['propertyKey'];
            await this.skillOwnerConditionsRepository.create(ownerCondition);
            Logger.debug('Created owner condition.', ownerCondition);
        }
    }

    async updateClassPathLevelSkill(skillsData, existentSkill)
    {
        if(0 === skillsData.classPaths.length){
            return;
        }
        for(let classPathData of skillsData.classPaths){
            classPathData.skill_id = existentSkill.id;
            let existentClassPathLevelSkill = await this.classPathLevelSkillsRepository.loadOne(classPathData);
            if(!existentClassPathLevelSkill){
                await this.classPathLevelSkillsRepository.create(classPathData);
            }
        }
    }

    async updateObjectSkill(skillsData, existentSkill)
    {
        if(0 === skillsData.objects.length){
            return false;
        }
        for(let objectData of skillsData.objects){
            let existentObject = await this.objectsRepository.loadOneBy('object_class_key', objectData.objectKey);
            if(!existentObject){
                Logger.warning('Object not found by key: "' + objectData.objectKey + '".');
                continue;
            }
            objectData.object_id = existentObject.id;
            objectData.skill_id = existentSkill.id;
            delete objectData['objectKey'];
            let objectSkill = await this.objectsSkillsRepository.loadOne({
                object_id: existentObject.id,
                skill_id: existentSkill.id
            });
            if(objectSkill){
                this.objectsSkillsRepository.updateById(objectSkill.id, objectData);
                continue;
            }
            this.objectsSkillsRepository.create(objectData);
        }
    }

    async removeAllSKills()
    {
        if(!this.options.removeAll){
            return false;
        }
        await this.objectsSkillsRepository.delete({});
        await this.classPathLevelSkillsRepository.delete({});
        await this.skillAnimationsRepository.delete({});
        await this.skillAttackRepository.delete({});
        await this.skillTargetEffectsRepository.delete({});
        await this.skillPhysicalDataRepository.delete({});
        await this.skillOwnerConditionsRepository.delete({});
        await this.skillOwnerEffectsRepository.delete({});
        await this.skillRepository.delete({});
        Logger.debug('Removed all skills.');
        return true;
    }

    async deleteSkill(skillId)
    {
        let filter = {skill_id: skillId};
        await this.objectsSkillsRepository.delete(filter);
        await this.classPathLevelSkillsRepository.delete(filter);
        await this.skillAnimationsRepository.delete(filter);
        await this.skillAttackRepository.delete(filter);
        await this.skillTargetEffectsRepository.delete(filter);
        await this.skillPhysicalDataRepository.delete(filter);
        await this.skillOwnerConditionsRepository.delete(filter);
        await this.skillOwnerEffectsRepository.delete(filter);
        await this.skillRepository.delete(filter);
        Logger.debug('Removed skill with ID "'+skillId+'".');
    }

    async loadExistentSkill(key)
    {
        return await this.skillRepository.loadOneByWithRelations('key', key, [
            'skill_attack',
            'skill_physical_data',
            'skill_owner_conditions',
            'skill_owner_effects',
            'skill_target_effects'
        ]);
    }

}

module.exports.SkillsImporter = SkillsImporter;
