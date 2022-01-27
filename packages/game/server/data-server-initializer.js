/**
 *
 * Reldens - DataServerInitializer
 *
 */

const { DataServerConfig } = require('./data-server-config');
const { EntitiesLoader } = require('./entities-loader');
const { ObjectionJsDataServer } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class DataServerInitializer
{

    static initializeEntitiesAndDriver(props)
    {
        let {config, dataServerDriver, serverManager} = props;
        let dataServerConfig = DataServerConfig.prepareDbConfig(config);
        let loadEntitiesOptions = {
            serverManager: serverManager,
            reldensModulePackagesPath: serverManager.themeManager.reldensModulePackagesPath,
            bucketFullPath: serverManager.themeManager.projectThemePath,
            distPath: serverManager.themeManager.distPath,
            isHotPlugEnabled: serverManager.isHotPlugEnabled,
            withConfig: true,
            withTranslations: true,
            storageDriver: dataServerConfig.storageDriver
        };
        let loadedEntities = EntitiesLoader.loadEntities(loadEntitiesOptions);
        dataServerConfig.loadedEntities = loadedEntities.entities;
        dataServerConfig.translations = sc.get(loadedEntities, 'translations', {});
        dataServerConfig.rawEntities = Object.assign(loadedEntities.entitiesRaw, sc.get(config, 'rawEntities', {}));
        let dataServer = dataServerDriver || new ObjectionJsDataServer(dataServerConfig);
        return {dataServerConfig, dataServer};
    }

}

module.exports.DataServerInitializer = DataServerInitializer;
