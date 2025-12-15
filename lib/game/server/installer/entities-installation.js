/**
 *
 * Reldens - EntitiesInstallation
 *
 * Handles entity generation from the database schema for different storage drivers (ObjectionJS, MikroORM, Prisma).
 * For the Prisma driver, orchestrates schema introspection and client generation before entity creation.
 * Integrates with the EntitiesGenerator from @reldens/storage to produce entity classes.
 *
 */

const { DriversClassMap, EntitiesGenerator } = require('@reldens/storage');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} EntitiesInstallationProps
 * @property {string} [projectRoot]
 * @property {Object|false} [prismaInstallation]
 *
 * @typedef {Object} DbConfig
 * @property {string} client
 * @property {Object} config
 * @property {string} config.host
 * @property {number} config.port
 * @property {string} config.database
 * @property {string} config.user
 * @property {string} config.password
 * @property {boolean} config.multipleStatements
 * @property {boolean} debug
 */
class EntitiesInstallation
{

    /**
     * @param {EntitiesInstallationProps} props
     */
    constructor(props)
    {
        /** @type {string} */
        this.projectRoot = sc.get(props, 'projectRoot', './');
        /** @type {Object|false} */
        this.prismaInstallation = sc.get(props, 'prismaInstallation', false);
    }

    /**
     * @param {Object} server
     * @param {boolean} isOverride
     * @param {boolean} isInstallationMode
     * @param {boolean} isDryPrisma
     * @param {DbConfig|null} dbConfig
     * @param {string} storageDriverKey
     * @returns {Promise<boolean>}
     */
    async generateEntities(server, isOverride, isInstallationMode, isDryPrisma, dbConfig, storageDriverKey)
    {
        let driverType = sc.get(DriversClassMap, server.constructor.name, storageDriverKey);
        Logger.debug('Driver type detected: '+driverType+', Server constructor: '+server.constructor.name);
        if('prisma' === driverType && !isDryPrisma){
            Logger.info('Running prisma introspect "npx prisma db pull"...');
            if(!dbConfig){
                dbConfig = this.extractDbConfigFromServer(server);
                Logger.debug('Extracted DB config.');
            }
            Logger.debug('DB config:', dbConfig);
            if(dbConfig){
                let generatedPrismaSchema = await this.prismaInstallation.generatePrismaSchema(dbConfig);
                if(!generatedPrismaSchema){
                    Logger.error('Prisma schema generation failed.');
                    return false;
                }
                Logger.info('Generated Prisma schema for entities generation.');
                if(isInstallationMode){
                    Logger.info('Creating local Prisma client for entities generation...');
                    let localPrismaClient = await this.prismaInstallation.createPrismaClient(this.projectRoot);
                    if(localPrismaClient){
                        this.prismaInstallation.prismaClient = localPrismaClient;
                        server.prisma = localPrismaClient;
                    }
                }
            }
        }
        if('prisma' === driverType && isDryPrisma){
            Logger.info('Skipping Prisma schema generation due to --dry-prisma flag.');
        }
        let generatorConfig = {server, projectPath: this.projectRoot, isOverride};
        if('prisma' === driverType && this.prismaInstallation.prismaClient){
            generatorConfig.prismaClient = this.prismaInstallation.prismaClient;
        }
        let generator = new EntitiesGenerator(generatorConfig);
        let success = await generator.generate();
        if(!success){
            Logger.error('Entities generation failed.');
        }
        return success;
    }

    /**
     * @param {Object} server
     * @returns {DbConfig|false}
     */
    extractDbConfigFromServer(server)
    {
        let config = sc.get(server, 'config');
        if(!config){
            Logger.warning('Could not extract database config from server.');
            return false;
        }
        let dbConfig = {
            client: sc.get(server, 'client', 'mysql'),
            config: {
                host: sc.get(config, 'host', 'localhost'),
                port: sc.get(config, 'port', 3306),
                database: sc.get(config, 'database', ''),
                user: sc.get(config, 'user', ''),
                password: sc.get(config, 'password', ''),
                multipleStatements: true
            },
            debug: false
        };
        Logger.debug('Extracted DB config structure:', {
            client: dbConfig.client,
            host: dbConfig.config.host,
            database: dbConfig.config.database
        });
        return dbConfig;
    }

}

module.exports.EntitiesInstallation = EntitiesInstallation;
