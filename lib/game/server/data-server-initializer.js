/**
 *
 * Reldens - DataServerInitializer
 *
 * Static utility class for initializing the data server and database connections.
 * Handles loading entities, configuring the storage driver (Knex by default, plus the optional Kysely, Drizzle,
 * ObjectionJS, MikroORM and Prisma drivers when their packages are installed in the project), rebinding
 * ObjectionJS models to new Knex instances, and building the Prisma modules from the project generated client.
 *
 */

const { DataServerConfig } = require('./data-server-config');
const { EntitiesLoader } = require('./entities-loader');
const { StorageDriversResolver } = require('@reldens/cms/lib/storage-drivers-resolver');
const { DriversMap, PackageResolver } = require('@reldens/storage');
const { EnvVar, Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

class DataServerInitializer
{

    /**
     * @param {Object} props
     * @param {Object<string, any>} props.config
     * @param {BaseDataServer} [props.dataServerDriver]
     * @param {ServerManager} props.serverManager
     * @param {BaseDataServer|null} [props.installerDataServer]
     * @returns {{dataServerConfig: Object<string, any>, dataServer: BaseDataServer}}
     */
    static initializeEntitiesAndDriver(props)
    {
        let {config, dataServerDriver, serverManager, installerDataServer} = props;
        let dataServerConfig = DataServerConfig.prepareDbConfig(config);
        let projectRoot = serverManager.themeManager.projectRoot;
        let loadEntitiesOptions = {
            serverManager: serverManager,
            projectRoot,
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
        dataServerConfig.projectRoot = projectRoot;
        Logger.info('Storage Driver:', dataServerConfig.storageDriver);
        let modulesProp = StorageDriversResolver.modulesProp(dataServerConfig.storageDriver);
        if(modulesProp){
            dataServerConfig[modulesProp] = this.loadDriverModules(dataServerConfig, projectRoot, installerDataServer);
        }
        return {
            dataServerConfig,
            dataServer: dataServerDriver || new DriversMap[dataServerConfig.storageDriver](dataServerConfig)
        };
    }

    /**
     * @param {Object<string, any>} dataServerConfig
     * @param {string} projectRoot
     * @param {BaseDataServer|null} installerDataServer
     * @returns {Object|false}
     */
    static loadDriverModules(dataServerConfig, projectRoot, installerDataServer)
    {
        if('prisma' === dataServerConfig.storageDriver){
            return this.loadProjectPrismaModules(installerDataServer, projectRoot);
        }
        return StorageDriversResolver.loadModules(dataServerConfig.storageDriver, projectRoot, dataServerConfig.client);
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
                Logger.info('Entities not bound to knex, rebinding required.', error.message);
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
     * @returns {Object|false}
     */
    static loadProjectPrismaModules(installerDataServer, projectRoot)
    {
        if(installerDataServer?.prismaModules){
            return installerDataServer.prismaModules;
        }
        let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
        if(!FileHandler.exists(clientPath)){
            Logger.error('Prisma client path not found: '+clientPath);
            return false;
        }
        let adapterPackage = EnvVar.nonEmptyString(process.env, 'RELDENS_PRISMA_ADAPTER', '@prisma/adapter-mariadb');
        let adapterClass = EnvVar.nonEmptyString(process.env, 'RELDENS_PRISMA_ADAPTER_CLASS', 'PrismaMariaDb');
        let adapterModule = PackageResolver.loadPackage(adapterPackage, projectRoot);
        if(!sc.isFunction(sc.get(adapterModule, adapterClass, false))){
            Logger.error('Prisma adapter class "'+adapterClass+'" not found in package: '+adapterPackage);
            return false;
        }
        try {
            let prismaClientModule = require(clientPath);
            return {
                PrismaClient: prismaClientModule.PrismaClient,
                Prisma: prismaClientModule.Prisma,
                PrismaAdapter: adapterModule[adapterClass]
            };
        } catch(error) {
            Logger.error('Failed to load project Prisma client: '+error.message);
            return false;
        }
    }

}

module.exports.DataServerInitializer = DataServerInitializer;
