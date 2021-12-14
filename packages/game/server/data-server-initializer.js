/**
 *
 * Reldens - DataServerInitializer
 *
 */

const { DataServerConfig } = require('./data-server-config');
const { EntitiesLoader } = require('./entities-loader');
const { ObjectionJsDataServer } = require('@reldens/storage');
const { Logger, sc } = require('@reldens/utils');

class DataServerInitializer
{

    static initializeEntitiesAndDriver(config, dataServerDriver, serverManager)
    {
        let dataServerConfig = DataServerConfig.prepareDbConfig(config);
        let loadEntitiesOptions = {
            serverManager: serverManager,
            projectRoot: serverManager.projectRoot,
            projectTheme: config.projectTheme,
            bucketFullPath: serverManager.themeManager.themeFullPath,
            distFullPath: serverManager.themeManager.distFullPath,
            isHotPlugEnabled: serverManager.isHotPlugEnabled,
            withConfig: true,
            withTranslations: true,
            storageDriver: dataServerConfig.storageDriver
        };
        let loadedEntities = EntitiesLoader.loadEntities(loadEntitiesOptions);
        dataServerConfig.loadedEntities = loadedEntities.entities;
        dataServerConfig.translations = sc.getDef(loadedEntities, 'translations', {});
        dataServerConfig.rawEntities = Object.assign(loadedEntities.entitiesRaw, sc.getDef(config, 'rawEntities', {}));
        let dataServer = dataServerDriver || new ObjectionJsDataServer(dataServerConfig);
        dataServerConfig.preparedEntities = this.prepareEntities(
            dataServerConfig.loadedEntities,
            dataServer.entityManager.entities
        );
        return {dataServerConfig, dataServer};
    }

    static prepareEntities(loadedEntities, generatedDrivers)
    {
        let rawEntitiesKeys = Object.keys(loadedEntities);
        let driverEntitiesKeys = Object.keys(generatedDrivers);
        if(rawEntitiesKeys.length !== driverEntitiesKeys.length){
            Logger.error('Raw entities and driver entities mismatch.', rawEntitiesKeys, driverEntitiesKeys);
            return {};
        }
        let preparedEntities = {};
        for(let i of rawEntitiesKeys){
            preparedEntities[i] = {
                rawEntity: generatedDrivers[i],
                config: loadedEntities[i].config
            }
        }
        return preparedEntities;
    }

}

module.exports.DataServerInitializer = DataServerInitializer;
