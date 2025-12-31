/**
 *
 * Reldens - AttributesPerLevelImporter
 *
 * Imports player stat configurations per level and class path. Creates stats definitions,
 * then generates level modifiers that incrementally increase player stats (hp, mp, atk, etc.)
 * as they level up within each class path.
 *
 */

const { ClassPathKeyFactory } = require('../../actions/factories/class-path-key-factory');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../game/server/manager').ServerManager} ServerManager
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 */
class AttributesPerLevelImporter
{

    /**
     * @param {ServerManager} serverManager
     */
    constructor(serverManager)
    {
        /** @type {ServerManager} */
        this.serverManager = serverManager;
        /** @type {BaseDriver} */
        this.statsRepository = this.serverManager?.dataServer?.getEntity('stats');
        /** @type {BaseDriver} */
        this.objectsStatsRepository = this.serverManager?.dataServer?.getEntity('objectsStats');
        /** @type {BaseDriver} */
        this.classPathRepository = this.serverManager.dataServer.getEntity('skillsClassPath');
        /** @type {BaseDriver} */
        this.levelRepository = this.serverManager.dataServer.getEntity('skillsLevels');
        /** @type {BaseDriver} */
        this.levelModifiersRepository = this.serverManager.dataServer.getEntity('skillsLevelsModifiers');
        /** @type {Object<string, Object>} */
        this.statsModels = {};
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
        if(!this.validRepositories([
            'statsRepository',
            'objectsStatsRepository',
            'classPathRepository',
            'levelRepository',
            'levelModifiersRepository'
        ])){
            return false;
        }
        /** @type {string} */
        this.modifierKeyPrefix = data.modifierKeyPrefix || 'inc_';
        /** @type {number} */
        this.operationId = data.operationId || 1;
        /** @type {Array<string>} */
        this.propertiesPaths = data.propertiesPaths || ['stats/', 'statsBase/'];
        this.statsModels = data.statsModels || {};
        if(data.stats){
            await this.createStats(data.stats);
        }
        if(data.statsByVariation?.player){
            await this.createPlayerStatsPerLevelAndClassPath(data.statsByVariation.player);
        }
        return true;
    }

    /**
     * @param {Array<string>} repositoriesKey
     * @returns {boolean}
     */
    validRepositories(repositoriesKey)
    {
        for(let repositoryKey of repositoriesKey){
            if(!this[repositoryKey]){
                Logger.critical('Repository "'+repositoryKey+'" not found.');
                return false;
            }
        }
        return true;
    }

    /**
     * @param {Object<string, Object>} statsData
     * @returns {Promise<Object<string, Object>>}
     */
    async createStats(statsData)
    {
        for(let i of Object.keys(statsData)){
            let stat = statsData[i];
            stat.key = i;
            this.statsModels[i] = await this.statsRepository.create(stat);
        }
        return this.statsModels;
    }

    /**
     * @param {Object<string, Object>} playerStatsByLevelAndClassPath
     * @returns {Promise<void>}
     */
    async createPlayerStatsPerLevelAndClassPath(playerStatsByLevelAndClassPath)
    {
        for(let level of Object.keys(playerStatsByLevelAndClassPath)){
            let statsByClassPath = playerStatsByLevelAndClassPath[level];
            await this.createPlayerStatsPerClassPath(statsByClassPath, level);
        }
    }

    /**
     * @param {Object<string, Object>} statsByClassPath
     * @param {string} level
     * @returns {Promise<void>}
     */
    async createPlayerStatsPerClassPath(statsByClassPath, level)
    {
        for(let classPathLabel of Object.keys(statsByClassPath)){
            let key = ClassPathKeyFactory.fromLabel(classPathLabel);
            let levelModel = await this.fetchLevelByClassPathKey(level, key);
            if(!levelModel){
                Logger.error('Level ID not found for key "' + level + '" and class path key "' + key + '".');
                continue;
            }
            let statsData = statsByClassPath[classPathLabel];
            await this.createPlayerStats(statsData, levelModel);
        }
    }

    /**
     * @param {Object} statsData
     * @param {Object} levelModel
     * @returns {Promise<void>}
     */
    async createPlayerStats(statsData, levelModel)
    {
        for(let statKey of Object.keys(statsData)){
            let statId = this.statsModels[statKey] || await this.fetchStatIdByKey(statKey);
            if(!statId){
                Logger.error('Stat ID not found for key "' + statKey + '".');
                continue;
            }
            await this.createStatsModifiers(levelModel, statKey, statsData);
        }
    }

    /**
     * @param {Object} levelModel
     * @param {string} statKey
     * @param {Object} statsData
     * @returns {Promise<void>}
     */
    async createStatsModifiers(levelModel, statKey, statsData)
    {
        for(let propertyPath of this.propertiesPaths){
            let modifierCreateData = {
                level_id: levelModel.id,
                key: this.modifierKeyPrefix + statKey,
                property_key: propertyPath + statKey,
                operation: this.operationId,
                value: statsData[statKey]
            };
            let result = await this.levelModifiersRepository.create(modifierCreateData);
            if(result){
                Logger.info('Created level modifier with ID "' + result.id + '".', modifierCreateData);
            }
        }
    }

    /**
     * @param {string} statKey
     * @returns {Promise<Object|null>}
     */
    async fetchStatIdByKey(statKey)
    {
        return await this.statsRepository.loadOneBy('key', statKey);
    }

    /**
     * @param {string} level
     * @param {string} classPathKey
     * @returns {Promise<Object|boolean>}
     */
    async fetchLevelByClassPathKey(level, classPathKey)
    {
        let classPath = await this.classPathRepository.loadOneBy('key', classPathKey);
        if(!classPath){
            Logger.error('ClassPath not found for key "'+classPath+'".');
            return false;
        }
        return await this.levelRepository.loadOne({key: Number(level), level_set_id: classPath.levels_set_id});
    }

}

module.exports.AttributesPerLevelImporter = AttributesPerLevelImporter;
