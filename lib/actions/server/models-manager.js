/**
 *
 * Reldens - Skills - ModelsManager
 *
 * Manages database operations for skills, class paths, and related entities.
 *
 */

const { ClassPathGenerator } = require('./storage/class-path-generator');
const { SkillsGenerator } = require('./storage/skills-generator');
const { SkillsClassPathLoader } = require('./skills-class-path-loader');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 *
 * @typedef {Object} ModelsManagerProps
 * @property {BaseDataServer} [dataServer]
 * @property {EventsManager} [events]
 */
class ModelsManager
{

    /**
     * @param {ModelsManagerProps} props
     */
    constructor(props)
    {
        /** @type {BaseDataServer|false} */
        this.dataServer = sc.get(props, 'dataServer', false);
        /** @type {EventsManager} */
        this.events = sc.get(props, 'events', EventsManagerSingleton);
    }

    /**
     * @param {string} entityName
     * @returns {any|false}
     */
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

    /**
     * @param {number} ownerId
     * @returns {Promise<any>}
     */
    async loadOwnerClassPath(ownerId)
    {
        return await this.getEntity('skillsOwnersClassPath').loadOneByWithRelations(
            'owner_id',
            ownerId,
            'related_skills_class_path'
        );
    }

    /**
     * @param {Object} levelsSet
     * @returns {Promise<any>}
     */
    async updateLevel(levelsSet)
    {
        return await this.getEntity('skillsOwnersClassPath').updateBy(
            'owner_id',
            levelsSet.getOwnerId(),
            {currentLevel: levelsSet.currentLevel}
        );
    }

    /**
     * @param {Object} levelsSet
     * @returns {Promise<any>}
     */
    async updateExperience(levelsSet)
    {
        return await this.getEntity('skillsOwnersClassPath').updateBy(
            'owner_id',
            levelsSet.getOwnerId(),
            {currentExp: levelsSet.currentExp}
        );
    }

    /**
     * @param {Object} skillsClasses
     * @returns {Promise<Object>}
     */
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

    /**
     * @param {Object} classPathClasses
     * @returns {Promise<Object>}
     */
    async generateClassPathInstances(classPathClasses)
    {
        let loader = new SkillsClassPathLoader({dataServer: this.dataServer});
        return ClassPathGenerator.fromClassPathModels(await loader.loadFullPathData(), classPathClasses);
    }

    /**
     * @param {Object} owner
     * @param {string} ownerIdProperty
     * @param {Object} classPathsListById
     * @param {Object} skillsClassesList
     * @returns {Promise<Object|boolean>}
     */
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
