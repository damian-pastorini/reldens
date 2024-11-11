/**
 *
 * Reldens - AttributesPerLevelImporter
 *
 */

const { ClassPathKeyFactory } = require('../../actions/factories/class-path-key-factory');
const { Logger } = require('@reldens/utils');

class AttributesPerLevelImporter
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
        this.statsRepository = this.serverManager?.dataServer?.getEntity('stats');
        this.objectsStatsRepository = this.serverManager?.dataServer?.getEntity('objectsStats');
        this.classPathRepository = this.serverManager.dataServer.getEntity('classPath');
        this.levelRepository = this.serverManager.dataServer.getEntity('level');
        this.levelModifiersRepository = this.serverManager.dataServer.getEntity('levelModifiers');
        this.statsModels = {};
    }

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
        this.modifierKeyPrefix = data.modifierKeyPrefix || 'inc_';
        this.operationId = data.operationId || 1;
        this.propertiesPaths = data.propertiesPaths || ['stats/', 'statsBase/'];
        this.statsModels = data.statsModels || {};
        if(data.stats){
            await this.createStats(data.stats);
        }
        if(data.statsByVariation?.player){
            await this.createPlayerStatsPerLevelAndClassPath(data.statsByVariation.player);
        }
    }

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

    async createStats(statsData)
    {
        for(let i of Object.keys(statsData)){
            let stat = statsData[i];
            stat.key = i;
            this.statsModels[i] = await this.statsRepository.create(stat);
        }
        return this.statsModels;
    }

    async createPlayerStatsPerLevelAndClassPath(playerStatsByLevelAndClassPath)
    {
        for(let level of Object.keys(playerStatsByLevelAndClassPath)){
            let statsByClassPath = playerStatsByLevelAndClassPath[level];
            await this.createPlayerStatsPerClassPath(statsByClassPath, level);
        }
    }

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

    async fetchStatIdByKey(statKey)
    {
        return await this.statsRepository.loadOneBy('key', statKey);
    }

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
