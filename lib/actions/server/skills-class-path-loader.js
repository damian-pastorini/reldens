/**
 *
 * Reldens - Skills - SkillsClassPathLoader
 *
 * Loads class path data with levels, skills, and their relationships.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 *
 * @typedef {Object} SkillsClassPathLoaderProps
 * @property {BaseDataServer} [dataServer]
 */
class SkillsClassPathLoader
{

    /**
     * @param {SkillsClassPathLoaderProps} props
     */
    constructor(props)
    {
        /** @type {BaseDataServer|false} */
        this.dataServer = sc.get(props, 'dataServer', false);
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
     * @returns {Promise<Array>}
     */
    async loadFullPathData()
    {
        let classPathModels = await this.loadClassPathsWithLevelsSet();
        if(!sc.isArray(classPathModels) || 0 === classPathModels.length){
            return [];
        }
        let classPathIds = classPathModels.map(classPath => classPath.id);
        let levelLabelsMap = await this.loadLevelLabelsByClassPathIds(classPathIds);
        let levelSkillsMap = await this.loadLevelSkillsByClassPathIds(classPathIds);
        let skillIds = this.extractSkillIds(levelSkillsMap);
        let skillsMap = await this.loadSkillsWithRelations(skillIds);
        return this.mapClassPathData(classPathModels, levelLabelsMap, levelSkillsMap, skillsMap);
    }

    /**
     * @returns {Promise<Array>}
     */
    async loadClassPathsWithLevelsSet()
    {
        return await this.getEntity('skillsClassPath').loadAllWithRelations([
            'related_skills_levels_set.related_skills_levels.related_skills_levels_modifiers'
        ]);
    }

    /**
     * @param {Array<number>} classPathIds
     * @returns {Promise<Object>}
     */
    async loadLevelLabelsByClassPathIds(classPathIds)
    {
        let levelLabels = await this.getEntity('skillsClassPathLevelLabels').loadWithRelations(
            {class_path_id: {operator: 'IN', value: classPathIds}},
            ['related_skills_levels']
        );
        return this.groupByClassPathId(levelLabels);
    }

    /**
     * @param {Array<number>} classPathIds
     * @returns {Promise<Object>}
     */
    async loadLevelSkillsByClassPathIds(classPathIds)
    {
        let levelSkills = await this.getEntity('skillsClassPathLevelSkills').loadWithRelations(
            {class_path_id: {operator: 'IN', value: classPathIds}},
            ['related_skills_levels']
        );
        return this.groupByClassPathId(levelSkills);
    }

    /**
     * @param {Object} levelSkillsMap
     * @returns {Array<number>}
     */
    extractSkillIds(levelSkillsMap)
    {
        let skillIds = [];
        let classPathIds = Object.keys(levelSkillsMap);
        for(let classPathId of classPathIds){
            let levelSkills = levelSkillsMap[classPathId];
            for(let levelSkill of levelSkills){
                if(-1 === skillIds.indexOf(levelSkill.skill_id)){
                    skillIds.push(levelSkill.skill_id);
                }
            }
        }
        return skillIds;
    }

    /**
     * @param {Array<number>} skillIds
     * @returns {Promise<Object>}
     */
    async loadSkillsWithRelations(skillIds)
    {
        if(0 === skillIds.length){
            return {};
        }
        let skills = await this.getEntity('skillsSkill').loadWithRelations(
            {id: {operator: 'IN', value: skillIds}},
            [
                'related_skills_skill_attack',
                'related_skills_skill_physical_data',
                'related_skills_skill_owner_conditions',
                'related_skills_skill_owner_effects',
                'related_skills_skill_target_effects'
            ]
        );
        return this.indexById(skills);
    }

    /**
     * @param {Array} items
     * @returns {Object}
     */
    groupByClassPathId(items)
    {
        let result = {};
        if(!sc.isArray(items)){
            return result;
        }
        for(let item of items){
            let classPathId = item.class_path_id;
            if(!sc.hasOwn(result, classPathId)){
                result[classPathId] = [];
            }
            result[classPathId].push(item);
        }
        return result;
    }

    /**
     * @param {Array} items
     * @returns {Object}
     */
    indexById(items)
    {
        let result = {};
        if(!sc.isArray(items)){
            return result;
        }
        for(let item of items){
            result[item.id] = item;
        }
        return result;
    }

    /**
     * @param {Array} classPathModels
     * @param {Object} levelLabelsMap
     * @param {Object} levelSkillsMap
     * @param {Object} skillsMap
     * @returns {Array}
     */
    mapClassPathData(classPathModels, levelLabelsMap, levelSkillsMap, skillsMap)
    {
        for(let classPath of classPathModels){
            classPath.related_skills_class_path_level_labels = sc.get(levelLabelsMap, classPath.id, []);
            let levelSkills = sc.get(levelSkillsMap, classPath.id, []);
            this.attachSkillsToLevelSkills(levelSkills, skillsMap);
            this.sortLevelSkillsBySkillKey(levelSkills);
            classPath.related_skills_class_path_level_skills = levelSkills;
        }
        return classPathModels;
    }

    /**
     * @param {Array} levelSkills
     * @param {Object} skillsMap
     */
    attachSkillsToLevelSkills(levelSkills, skillsMap)
    {
        for(let levelSkill of levelSkills){
            levelSkill.related_skills_skill = sc.get(skillsMap, levelSkill.skill_id, null);
        }
    }

    /**
     * @param {Array} levelSkills
     */
    sortLevelSkillsBySkillKey(levelSkills)
    {
        levelSkills.sort((a, b) => {
            let keyA = sc.get(a, 'related_skills_skill.key', '');
            let keyB = sc.get(b, 'related_skills_skill.key', '');
            if(keyA < keyB){
                return -1;
            }
            if(keyA > keyB){
                return 1;
            }
            return 0;
        });
    }

}

module.exports.SkillsClassPathLoader = SkillsClassPathLoader;
