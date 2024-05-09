/**
 *
 * Reldens - SkillsImporter
 *
 */

const { SkillDataFactory } = require('../../actions/factories/skill-data-factory');
const { Logger, sc } = require('@reldens/utils');

class SkillsImporter
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
        this.skillRepository = this.serverManager.dataServer.getEntity('skill');
        this.skillAttackRepository = this.serverManager.dataServer.getEntity('skillAttack');
        this.skillTargetEffectsRepository = this.serverManager.dataServer.getEntity('skillTargetEffects');
        this.skillPhysicalDataRepository = this.serverManager.dataServer.getEntity('skillPhysicalData');
        this.skillOwnerConditionsRepository = this.serverManager.dataServer.getEntity('skillOwnerConditions');
        this.skillOwnerEffectsRepository = this.serverManager.dataServer.getEntity('skillOwnerEffects');
        this.skillAnimationsRepository = this.serverManager.dataServer.getEntity('animations');
        this.classPathLevelSkillsRepository = this.serverManager.dataServer.getEntity('classPathLevelSkills');
        this.levelsRepository = this.serverManager.dataServer.getEntity('levels');
        this.classPathRepository = this.serverManager.dataServer.getEntity('classPath');
        this.objectsRepository = this.serverManager.dataServer.getEntity('objects');
        this.objectsSkillsRepository = this.serverManager.dataServer.getEntity('objectsSkills');
        this.targetOptionsRepository = this.serverManager.dataServer.getEntity('targetOptions');
        this.operationTypesRepository = this.serverManager.dataServer.getEntity('operationTypes');
        this.skillTypeRepository = this.serverManager.dataServer.getEntity('skillType');
        this.targetOptions = {};
        this.operationTypes = {};
        this.skillTypes = {};
    }

    async import(data)
    {
        if(!data){
            Logger.critical('Import data not found.');
            return false;
        }
        this.options = sc.get(data, 'options', {
            removeAll: false,
            override: false,
            update: true
        });
        this.defaults = sc.get(data, 'defaults', {});
        this.skills = sc.get(data, 'skills', {});
        if(0 === Object.keys(this.skills).length){
            Logger.critical('Skills data not found.');
            return false;
        }
        await this.loadTargetOptions();
        await this.loadOperationTypes();
        await this.loadSkillTypes();
        await this.removeAllSKills();
        for(let key of Object.keys(this.skills)){
            let existentSkill = await this.loadExistentSkill(key);
            if(!this.options.override && !this.options.update && existentSkill){
                continue;
            }
            let skillRawData = this.skills[key];
            let skillsData = (new SkillDataFactory()).mapData(key, skillRawData, this.defaults);
            skillsData.type = this.skillTypes[skillRawData.typeData.key].id;
            if(this.options.update && existentSkill){
                await this.updateSkill(existentSkill, skillsData);
                continue;
            }
            if(this.options.override && existentSkill){
                await this.deleteSkill(existentSkill.id);
            }
            await this.createSkill(key, skillsData);
        }
    }

    async loadTargetOptions()
    {
        let targetOptionsModels = await this.targetOptionsRepository.loadAll();
        for(let targetOption of targetOptionsModels){
            this.targetOptions[targetOption.target_key] = targetOption;
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
        if (0 < skillsData.objects.length) {
            for (let objectData of skillsData.objects) {
                await this.updateObjectSkill(objectData, existentSkill);
            }
        }
        if (0 < skillsData.classPaths.length) {
            for (let classPathData of skillsData.classPaths) {
                await this.updateClassPathLevelSkill(existentSkill, classPathData);
            }
        }
        if (skillsData.attack) {
            await this.skillAttackRepository.updateBy('skill_id', existentSkill.id, skillsData.attack);
        }
        if (skillsData.physicalData) {
            this.skillPhysicalDataRepository.updateBy('skill_id', existentSkill.id, skillsData.physicalData);
        }
        await this.updateTargetEffects(skillsData, existentSkill);
        await this.updateOwnerEffects(skillsData, existentSkill);
        await this.updateOwnerConditions(skillsData, existentSkill);
    }

    async updateTargetEffects(skillsData, existentSkill)
    {
        if(-1 !== skillsData.clearPrevious.indexOf('targetEffects')){
            await this.skillTargetEffectsRepository.deleteBy({skill_id: existentSkill.id});
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
            await this.skillOwnerEffectsRepository.deleteBy({skill_id: existentSkill.id});
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

    async updateOwnerConditions(skillsData, existentSkill)
    {
        if(-1 !== skillsData.clearPrevious.indexOf('ownerConditions')){
            await this.skillOwnerConditionsRepository.deleteBy({skill_id: existentSkill.id});
        }
        if(0 === skillsData.ownerConditions.length){
            return;
        }
        for(let ownerEffect of skillsData.ownerConditions){
            ownerEffect.skill_id = existentSkill.id;
            delete ownerEffect['propertyKey'];
            await this.skillOwnerConditionsRepository.create(ownerEffect);
        }
    }

    async updateClassPathLevelSkill(existentSkill, classPathData)
    {
        let existentClassPath = this.classPathRepository.loadOne({
            key: classPathData.classPathKey,
        })
        if(!existentClassPath){
            Logger.warning('ClassPath not found by key: "' + classPathData.classPathKey + '".');
            return false;
        }
        let existentLevel = this.levelsRepository.loadOneBy('key', classPathData.levelKey);
        if(!existentLevel){
            Logger.warning('Level not found by key: "' + classPathData.levelKey + '".');
            return false;
        }
        let existentClassPathLevelSkill = this.classPathLevelSkillsRepository.loadOne({
            class_path_id: existentClassPath.class_path_id,
            level_id: existentLevel.id,
            skill_id: existentSkill.id
        })
        if(existentClassPathLevelSkill){
            return true;
        }
        classPathData.class_path_id = existentClassPath.class_path_id;
        classPathData.level_id = existentLevel.id;
        classPathData.skill_id = existentSkill.id;
        delete classPathData['classPathKey'];
        delete classPathData['levelKey'];
        return this.classPathLevelSkillsRepository.create(classPathData);
    }

    async updateObjectSkill(objectData, existentSkill)
    {
        let existentObject = await this.objectsRepository.loadOneBy('key', objectData.objectKey);
        if(!existentObject){
            Logger.warning('Object not found by key: "' + objectData.objectKey + '".');
            return false;
        }
        let target = this.targetOptions[objectData.targetKey];
        if(!target){
            Logger.warning('Target not found by key: "' + objectData.targetKey + '".');
            return false;
        }
        objectData.target_id = target.id;
        objectData.object_id = existentObject.id;
        delete objectData['targetKey'];
        delete objectData['objectKey'];
        let objectSkill = await this.objectsSkillsRepository.loadOne({
            object_id: existentObject.id,
            skill_id: existentSkill.id
        });
        if(objectSkill){
            return this.objectsSkillsRepository.updateById(objectSkill.id, objectData);
        }
        return this.objectsSkillsRepository.create(objectData);
    }

    async removeAllSKills()
    {
        if(!this.options.removeAll){
            return false;
        }
        await this.objectsSkillsRepository.deleteBy({});
        await this.classPathLevelSkillsRepository.deleteBy({});
        await this.skillAnimationsRepository.deleteBy({});
        await this.skillAttackRepository.deleteBy({});
        await this.skillTargetEffectsRepository.deleteBy({});
        await this.skillPhysicalDataRepository.deleteBy({});
        await this.skillOwnerConditionsRepository.deleteBy({});
        await this.skillOwnerEffectsRepository.deleteBy({});
        await this.skillRepository.deleteBy({});
        return true;
    }

    async deleteSkill(skillId)
    {
        let filter = {skill_id: skillId};
        await this.objectsSkillsRepository.deleteBy(filter);
        await this.classPathLevelSkillsRepository.deleteBy(filter);
        await this.skillAnimationsRepository.deleteBy(filter);
        await this.skillAttackRepository.deleteBy(filter);
        await this.skillTargetEffectsRepository.deleteBy(filter);
        await this.skillPhysicalDataRepository.deleteBy(filter);
        await this.skillOwnerConditionsRepository.deleteBy(filter);
        await this.skillOwnerEffectsRepository.deleteBy(filter);
        await this.skillRepository.deleteBy(filter);
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
