/**
 *
 * Reldens - ClassPathsImporter
 *
 * Imports character class paths and their progression systems. Creates levels sets,
 * imports experience requirements per level, and assigns ability labels per level within each class path. Every
 * imported class path is stored enabled, so the class paths loader keeps it and a new player can pick it.
 *
 */

const { ClassPathKeyFactory } = require('../../actions/factories/class-path-key-factory');
const { PlayersExperiencePerLevelImporter } = require('./players-experience-per-level-importer');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/server/manager').ServerManager} ServerManager
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 */
class ClassPathsImporter
{

    /**
     * @param {ServerManager} serverManager
     */
    constructor(serverManager)
    {
        /** @type {ServerManager} */
        this.serverManager = serverManager;
        /** @type {PlayersExperiencePerLevelImporter} */
        this.playersExperiencePerLevelImporter = new PlayersExperiencePerLevelImporter(serverManager);
        /** @type {BaseDriver} */
        this.classPathRepository = this.serverManager.dataServer.getEntity('skillsClassPath');
        /** @type {BaseDriver} */
        this.classLabelRepository = this.serverManager.dataServer.getEntity('skillsClassPathLevelLabels');
        /** @type {BaseDriver} */
        this.levelRepository = this.serverManager.dataServer.getEntity('skillsLevels');
    }

    /**
     * @param {Object} data
     * @returns {Promise<boolean>}
     */
    async import(data)
    {
        if(!data){
            Logger.critical('Import data not found.');
            return false;
        }
        if(!data.classPaths){
            Logger.critical('Class paths data not found.');
            return false;
        }
        if(!data.levelsSets){
            Logger.critical('Levels sets data not found.');
            return false;
        }
        this.preAppendRaceToAbilities(data);
        for(let label of Object.keys(data.classPaths)){
            let levelsSetId = await this.playersExperiencePerLevelImporter.import(
                sc.get(data.levelsSets, label, data.levelsSets.all)
            );
            if(!levelsSetId){
                Logger.critical('Levels set could not be imported for label "'+label+'".');
                continue;
            }
            let key = ClassPathKeyFactory.fromLabel(label);
            let classPathData = {key, label, levels_set_id: levelsSetId, enabled: 1};
            let createdClassPath = await this.classPathRepository.create(classPathData);
            if(!createdClassPath){
                Logger.critical('Class path could not be created for label "'+label+'".', classPathData);
                continue;
            }
            Logger.info('Created class path with ID "'+createdClassPath.id+'".', classPathData);
            await this.createSubClasses(createdClassPath.id, data.classPaths[label], label, levelsSetId);
        }
        return true;
    }

    /**
     * @param {number} classPathId
     * @param {Object<string, string>} classPathLabels
     * @param {string} label
     * @param {number} levelsSetId
     * @returns {Promise<void>}
     */
    async createSubClasses(classPathId, classPathLabels, label, levelsSetId)
    {
        let levelsByKey = {};
        for(let level of await this.levelRepository.loadBy('level_set_id', levelsSetId)){
            levelsByKey[level.key] = level;
        }
        for(let pathKey of Object.keys(classPathLabels)){
            let level = sc.get(levelsByKey, pathKey, false);
            if(!level){
                Logger.error('Level "'+pathKey+'" not found in the levels set "'+levelsSetId+'" of "'+label+'".');
                continue;
            }
            let classPathLabelData = {class_path_id: classPathId, label: classPathLabels[pathKey], level_id: level.id};
            await this.classLabelRepository.create(classPathLabelData);
            Logger.info('Created class path label.', classPathLabelData);
        }
    }

    /**
     * @param {Object} data
     * @returns {Object|boolean}
     */
    preAppendRaceToAbilities(data)
    {
        if(!data.classPaths){
            return false;
        }
        if(!data.preAppendRace){
            return false;
        }
        for(let classPath in data.classPaths){
            let race = classPath.split(' - ')[0];
            let abilities = data.classPaths[classPath];
            for(let level in abilities){
                abilities[level] = race + ' - ' + abilities[level];
            }
        }
        return data;
    }

}

module.exports.ClassPathsImporter = ClassPathsImporter;
