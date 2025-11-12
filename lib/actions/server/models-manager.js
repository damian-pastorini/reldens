/**
 *
 * Reldens - Skills - ModelsManager
 *
 */

const { ClassPathGenerator } = require('./storage/class-path-generator');
const { SkillsGenerator } = require('./storage/skills-generator');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

class ModelsManager
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.events = sc.get(props, 'events', EventsManagerSingleton);
    }

    getEntity(entityName)
    {
        if(!entityName){
            Logger.warning('Entity name is missing.');
            return false;
        }
        if(!this.dataServer){
            Logger.warning('Data server is missing.');
            return false;
        }
        return this.dataServer.entityManager.get(entityName);
    }

    async loadOwnerClassPath(ownerId)
    {
        return await this.getEntity('skillsOwnersClassPath').loadOneByWithRelations(
            'owner_id',
            ownerId,
            'related_skills_class_path'
        );
    }

    async updateLevel(levelsSet)
    {
        return await this.getEntity('skillsOwnersClassPath').updateBy(
            'owner_id',
            levelsSet.getOwnerId(),
            {currentLevel: levelsSet.currentLevel}
        );
    }

    async updateExperience(levelsSet)
    {
        return await this.getEntity('skillsOwnersClassPath').updateBy(
            'owner_id',
            levelsSet.getOwnerId(),
            {currentExp: levelsSet.currentExp}
        );
    }

    async generateSkillsDataFromModels(skillsClasses)
    {
        // @TODO - BETA - Replace relations by constants on the registered-entities definition.
        //   This way we will be able to use the get method, save the entity in a variable and call the relations list
        //   from it.
        let skillsModels = await this.getEntity('skillsSkill').loadAllWithRelations([
            'related_skills_skill_attack',
            'related_skills_skill_physical_data',
            'related_skills_skill_owner_conditions',
            'related_skills_skill_owner_effects',
            'related_skills_skill_target_effects'
        ]);
        //Logger.debug('Skills Models:', skillsModels, 'Skills Classes:', skillsClasses);
        return SkillsGenerator.dataFromSkillsModelsWithClasses(skillsModels, skillsClasses, this.events);
    }

    async generateClassPathInstances(classPathClasses)
    {
        // @TODO - BETA - Remove the executeCustomQuery.
        return ClassPathGenerator.fromClassPathModels(
            await this.getEntity('skillsClassPath').executeCustomQuery('fullPathData'),
            classPathClasses
        );
    }

    // @TODO - Refactor or remove this method.
    async prepareClassPathData(owner, ownerIdProperty, classPathsListById, skillsClassesList)
    {
        // @TODO - BETA - Temporal one class path per player, we will have optional multiple classes.
        let currentPlayerClassPath = await this.loadOwnerClassPath(owner[ownerIdProperty]);
        if(!currentPlayerClassPath){
            Logger.error(['Undefined class path for player.', 'ID:', owner[ownerIdProperty]]);
            return false;
        }
        let currentClassPath = classPathsListById[currentPlayerClassPath.class_path_id];
        //Logger.debug('Current class path:', currentClassPath);
        let skillsByLevel = SkillsGenerator.skillsByLevelsFromSkillsModels(
            currentClassPath.data.related_skills_class_path_level_skills,
            owner,
            ownerIdProperty,
            skillsClassesList,
            this.events
        );
        //Logger.debug('Current Class Path:', currentClassPath);
        return {
            key: currentClassPath.data.key,
            label: currentClassPath.data.label,
            owner,
            ownerIdProperty,
            levels: currentClassPath.data.classPathLevels,
            labelsByLevel: currentClassPath.data.labelsByLevel,
            skillsByLevel,
            autoFillRanges: currentClassPath.data.related_skills_levels_set.autoFillRanges,
            autoSortLevels: currentClassPath.data.related_skills_levels_set.autoSortLevels,
            currentLevel: currentPlayerClassPath.currentLevel,
            currentExp: currentPlayerClassPath.currentExp,
        };
    }

}

module.exports.ModelsManager = ModelsManager;
