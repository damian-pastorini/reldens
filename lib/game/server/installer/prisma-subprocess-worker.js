/**
 *
 * Reldens - PrismaSubprocessWorker
 *
 * Subprocess worker for isolated Prisma database installation.
 * Runs in a forked child process to avoid Prisma client module caching issues with the main process.
 * Generates a minimal Prisma client, connects, executes migrations, and reports results via IPC.
 *
 */

const { PrismaSchemaGenerator } = require('@reldens/storage/lib/prisma/prisma-schema-generator');
const { PrismaClientLoader } = require('@reldens/storage/lib/prisma/prisma-client-loader');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} MigrationFilesMap
 * @property {string} db-install
 * @property {string} db-basic-config
 * @property {string} db-sample-data
 *
 * @typedef {Object} SubprocessMessage
 * @property {Object} dbConfig
 * @property {Object} templateVariables
 * @property {string} migrationsPath
 * @property {string} projectRoot
 */
class PrismaSubprocessWorker
{

    constructor()
    {
        this.setupProcessHandlers();
    }

    /**
     * @returns {MigrationFilesMap}
     */
    static migrationFiles()
    {
        return {
            'db-install': 'reldens-install-v4.0.0.sql',
            'db-basic-config': 'reldens-basic-config-v4.0.0.sql',
            'db-sample-data': 'reldens-sample-data-v4.0.0.sql'
        };
    }

    /**
     * @param {string} client
     * @returns {boolean}
     */
    isMySqlClient(client)
    {
        if(!client){
            return false;
        }
        return -1 !== client.indexOf('mysql');
    }

    setupProcessHandlers()
    {
        process.on('message', async (message) => {
            try {
                await this.processIncomingMessage(message);
            } catch(error) {
                Logger.error('PrismaSubprocessWorker error: '+error.message);
                this.sendErrorResponse(error.message);
                process.exit(1);
            }
        });
        process.on('uncaughtException', (error) => {
            Logger.error('PrismaSubprocessWorker uncaught exception: '+error.message);
            this.sendErrorResponse(error.message);
            process.exit(1);
        });
        process.on('unhandledRejection', (error) => {
            Logger.error('PrismaSubprocessWorker unhandled rejection: '+error.message);
            this.sendErrorResponse(error.message);
            process.exit(1);
        });
    }

    /**
     * @param {SubprocessMessage} message
     * @returns {Promise<void>}
     */
    async processIncomingMessage(message)
    {
        let dbConfig = sc.get(message, 'dbConfig', {});
        let templateVariables = sc.get(message, 'templateVariables', {});
        let migrationsPath = sc.get(message, 'migrationsPath', './migrations');
        let projectRoot = sc.get(message, 'projectRoot', './');
        PrismaSchemaGenerator.ensureStubFiles(projectRoot);
        let generator = new PrismaSchemaGenerator({
            ...dbConfig,
            clientOutputPath: FileHandler.joinPaths(projectRoot, 'prisma', 'client'),
            prismaSchemaPath: FileHandler.joinPaths(projectRoot, 'prisma')
        });
        FileHandler.createFolder(FileHandler.joinPaths(projectRoot, 'prisma'));
        generator.generateSchemaFile();
        generator.setDatabaseEnvironmentVariables();
        generator.generateConfigFile();
        if(!generator.generateClient()){
            this.sendErrorResponse('Failed to generate Prisma client.');
            return;
        }
        let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
        let { PrismaClient } = require(clientPath);
        let generatedClient = PrismaClientLoader.createWithAdapter(PrismaClient, process.env.DATABASE_URL);
        if(!generatedClient){
            this.sendErrorResponse('Failed to instantiate Prisma client.');
            return;
        }
        let { DriversMap } = require('@reldens/storage');
        let driverClass = DriversMap['prisma'];
        if(!driverClass){
            this.sendErrorResponse('Prisma driver class not found.');
            return;
        }
        dbConfig.prismaClient = generatedClient;
        let dbDriver = new driverClass(dbConfig);
        if(!await dbDriver.connect()){
            this.sendErrorResponse('Database connection failed.');
            return;
        }
        let client = sc.get(templateVariables, 'db-client', '');
        if(!this.isMySqlClient(client)){
            Logger.info('Non-MySQL client detected ('+client+'), skipping automated SQL scripts.');
            await generatedClient.$disconnect();
            this.sendSuccessResponse('Subprocess installation completed (manual setup required).');
            return;
        }
        let { MySQLInstaller } = require('@reldens/cms/lib/mysql-installer');
        let migrationFiles = PrismaSubprocessWorker.migrationFiles();
        for(let checkboxName of Object.keys(migrationFiles)){
            let fileName = migrationFiles[checkboxName];
            let isMarked = 'db-install' === checkboxName
                ? 'on'
                : ('1' === sc.get(templateVariables, checkboxName, '0') ? 'on' : 'off');
            let redirectError = await MySQLInstaller.executeQueryFile(
                isMarked,
                fileName,
                dbDriver,
                migrationsPath
            );
            if('' !== redirectError){
                this.sendErrorResponse('Migration failed: '+fileName);
                return;
            }
        }
        await generatedClient.$disconnect();
        this.sendSuccessResponse('Subprocess installation completed.');
    }

    /**
     * @param {string} message
     */
    sendSuccessResponse(message)
    {
        process.send({success: true, message});
    }

    /**
     * @param {string} errorMessage
     */
    sendErrorResponse(errorMessage)
    {
        process.send({success: false, error: errorMessage});
    }

}

module.exports.PrismaSubprocessWorker = PrismaSubprocessWorker;

new PrismaSubprocessWorker();
