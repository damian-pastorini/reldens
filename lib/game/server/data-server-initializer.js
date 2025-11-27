/**
 *
 * Reldens - DataServerInitializer
 *
 */

const { DataServerConfig } = require('./data-server-config');
const { EntitiesLoader } = require('./entities-loader');
const { DriversMap } = require('./storage/drivers-map');
const { Logger, sc } = require('@reldens/utils');

class DataServerInitializer
{

    static initializeEntitiesAndDriver(props)
    {
        let {config, dataServerDriver, serverManager} = props;
        let dataServerConfig = DataServerConfig.prepareDbConfig(config);
        let loadEntitiesOptions = {
            serverManager: serverManager,
            projectRoot: serverManager.themeManager.projectRoot,
            reldensModuleLibPath: serverManager.themeManager.reldensModuleLibPath,
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
        dataServerConfig.rawEntities = Object.assign(
            (loadedEntities?.entitiesRaw || {}),
            sc.get(config, 'rawEntities', {})
        );
        Logger.info('Storage Driver:', dataServerConfig.storageDriver);
        let dataServer = dataServerDriver || new DriversMap[dataServerConfig.storageDriver](dataServerConfig);
        return {dataServerConfig, dataServer};
    }

    static rebindObjectionJsModelsToNewKnex(dataServer, dataServerConfig)
    {
        if('objection-js' !== dataServerConfig.storageDriver){
            return;
        }
        if(!dataServer.knex){
            Logger.error('Cannot rebind models: DataServer knex instance not available.');
            return;
        }
        let rawEntities = dataServerConfig.rawEntities;
        let rawEntityKeys = Object.keys(rawEntities);
        if(!rawEntities || 0 === rawEntityKeys.length){
            Logger.warning('No raw entities to rebind.');
            return;
        }
        let firstEntityKey = [...rawEntityKeys].shift();
        let firstEntity = rawEntities[firstEntityKey];
        if(!firstEntity || 'function' !== typeof firstEntity.knex){
            Logger.warning('Cannot check if rebind is needed: invalid first entity.');
        }
        if(firstEntity && 'function' === typeof firstEntity.knex){
            try {
                let entityKnex = firstEntity.knex();
                if(entityKnex === dataServer.knex){
                    Logger.debug('Entities already bound to correct knex instance, skipping rebind.');
                    return;
                }
                Logger.info('Detected different knex instances, rebinding required.');
            } catch(error) {
                Logger.info('Entities not bound to knex, rebinding required.');
            }
        }
        //Logger.debug('Rebinding ObjectionJS models to new knex instance.');
        let reboundCount = 0;
        for(let entityKey of rawEntityKeys){
            let rawEntity = rawEntities[entityKey];
            if(!rawEntity || 'function' !== typeof rawEntity.knex){
                Logger.warning('Invalid raw entity for rebinding: '+entityKey);
                continue;
            }
            rawEntity.knex(dataServer.knex);
            reboundCount++;
        }
        Logger.info('Rebound '+reboundCount+' ObjectionJS models to new knex instance.');
    }

}

module.exports.DataServerInitializer = DataServerInitializer;
