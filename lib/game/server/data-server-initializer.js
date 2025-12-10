/**
 *
 * Reldens - DataServerInitializer
 *
 * Static utility class for initializing the data server and database connections.
 * Handles loading entities, configuring storage drivers (ObjectionJS/MikroORM/Prisma),
 * and rebinding ObjectionJS models to new Knex instances. Provides helpers for
 * Prisma client initialization from the project's generated client.
 *
 */

const { DataServerConfig } = require('./data-server-config');
const { EntitiesLoader } = require('./entities-loader');
const { DriversMap } = require('./storage/drivers-map');
const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

class DataServerInitializer
{

    /**
     * @param {Object} props
     * @param {Object<string, any>} props.config
     * @param {BaseDataServer} [props.dataServerDriver]
     * @param {ServerManager} props.serverManager
     * @param {PrismaClient|false} [props.prismaClient]
     * @returns {{dataServerConfig: Object<string, any>, dataServer: BaseDataServer}}
     */
    static initializeEntitiesAndDriver(props)
    {
        let {config, dataServerDriver, serverManager, prismaClient} = props;
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
        if(prismaClient && 'prisma' === dataServerConfig.storageDriver){
            dataServerConfig.prismaClient = prismaClient;
        }
        let dataServer = dataServerDriver || new DriversMap[dataServerConfig.storageDriver](dataServerConfig);
        return {dataServerConfig, dataServer};
    }

    /**
     * @param {BaseDataServer} dataServer
     * @param {Object<string, any>} dataServerConfig
     */
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

    /**
     * @param {BaseDataServer|null} installerDataServer
     * @param {string} projectRoot
     * @returns {PrismaClient|false}
     */
    static loadProjectPrismaClient(installerDataServer, projectRoot)
    {
        let storageDriver = sc.get(process.env, 'RELDENS_STORAGE_DRIVER', 'objection-js');
        if('prisma' !== storageDriver){
            return false;
        }
        if(installerDataServer?.prisma){
            return installerDataServer.prisma;
        }
        let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
        if(!FileHandler.exists(clientPath)){
            Logger.debug('Prisma client path not found: '+clientPath);
            return false;
        }
        try {
            let { PrismaClient } = require(clientPath);
            return new PrismaClient();
        } catch(error) {
            Logger.error('Failed to load project Prisma client: '+error.message);
            return false;
        }
    }

}

module.exports.DataServerInitializer = DataServerInitializer;
