/**
 *
 * Reldens - PrismaSubprocessWorker
 *
 */

const { MySQLInstaller } = require('@reldens/cms/lib/mysql-installer');
const { DriversMap } = require('@reldens/storage');
const { Logger, sc } = require('@reldens/utils');

class PrismaSubprocessWorker
{

    constructor()
    {
        this.setupProcessHandlers();
    }

    static migrationFiles()
    {
        return {
            'db-install': 'reldens-install-v4.0.0.sql',
            'db-basic-config': 'reldens-basic-config-v4.0.0.sql',
            'db-sample-data': 'reldens-sample-data-v4.0.0.sql'
        };
    }

    setupProcessHandlers()
    {
        process.on('message', async (message) => {
            try {
                await this.processIncomingMessage(message);
            } catch(error) {
                Logger.error('PrismaSubprocessWorker error: '+error.message);
                this.sendErrorResponse(error.message);
                setTimeout(() => process.exit(1), 100);
            }
        });
        process.on('uncaughtException', (error) => {
            Logger.error('PrismaSubprocessWorker uncaught exception: '+error.message);
            this.sendErrorResponse(error.message);
            setTimeout(() => process.exit(1), 100);
        });
        process.on('unhandledRejection', (error) => {
            Logger.error('PrismaSubprocessWorker unhandled rejection: '+error.message);
            this.sendErrorResponse(error.message);
            setTimeout(() => process.exit(1), 100);
        });
    }

    async processIncomingMessage(message)
    {
        let dbConfig = sc.get(message, 'dbConfig', {});
        let templateVariables = sc.get(message, 'templateVariables', {});
        let migrationsPath = sc.get(message, 'migrationsPath', './migrations');
        let projectRoot = sc.get(message, 'projectRoot', './');
        this.setDatabaseUrlEnvVar(dbConfig);
        let generatedClient = await MySQLInstaller.generateMinimalPrismaClient(dbConfig, projectRoot);
        if(!generatedClient){
            this.sendErrorResponse('Failed to generate Prisma client.');
            return;
        }
        dbConfig.prismaClient = generatedClient;
        let driverClass = DriversMap['prisma'];
        if(!driverClass){
            this.sendErrorResponse('Prisma driver class not found.');
            return;
        }
        let dbDriver = new driverClass(dbConfig);
        if(!await dbDriver.connect()){
            this.sendErrorResponse('Database connection failed.');
            return;
        }
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

    sendSuccessResponse(message)
    {
        process.send({success: true, message});
    }

    sendErrorResponse(errorMessage)
    {
        process.send({success: false, error: errorMessage});
    }

    setDatabaseUrlEnvVar(dbConfig)
    {
        let config = sc.get(dbConfig, 'config', {});
        let provider = sc.get(dbConfig, 'client', 'mysql');
        if(-1 !== provider.indexOf('mysql')){
            provider = 'mysql';
        }
        let user = sc.get(config, 'user', '');
        let password = sc.get(config, 'password', '');
        let host = sc.get(config, 'host', 'localhost');
        let port = sc.get(config, 'port', 3306);
        let database = sc.get(config, 'database', '');
        process.env.RELDENS_DB_URL = provider+'://'+user+':'+password+'@'+host+':'+port+'/'+database;
    }

}

module.exports.PrismaSubprocessWorker = PrismaSubprocessWorker;

new PrismaSubprocessWorker();
