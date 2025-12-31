/**
 *
 * Reldens - DatabaseResetUtility
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');
const { ObjectionJsDataServer } = require('@reldens/storage');

class DatabaseResetUtility
{

    constructor(config)
    {
        this.config = config;
    }

    async resetDatabase()
    {
        let dbConfig = {
            client: 'mysql2',
            config: {
                host: this.config.dbHost,
                port: Number(this.config.dbPort),
                database: this.config.dbName,
                user: this.config.dbUser,
                password: this.config.dbPassword,
                multipleStatements: true
            }
        };
        let dbDriver = new ObjectionJsDataServer(dbConfig);
        if(!await dbDriver.connect()){
            Logger.log(100, '', 'Database connection failed');
            return false;
        }
        let migrationsPath = FileHandler.joinPaths(__dirname, '..', 'migrations', 'production');
        let testDataPath = FileHandler.joinPaths(__dirname, '..', 'migrations', 'development');
        try {
            await this.executeQueryFile(migrationsPath, dbDriver, 'reldens-basic-config-v4.0.0.sql');
            Logger.log(100, '', 'Basic config executed');
            await this.executeQueryFile(testDataPath, dbDriver, 'reldens-test-sample-data-v4.0.0.sql');
            Logger.log(100, '', 'Test sample data executed');
            Logger.log(100, '', 'Database reset completed successfully');
            return true;
        } catch(error){
            Logger.log(100, '', 'Database reset failed: '+error.message);
            return false;
        }
    }

    async executeQueryFile(migrationsPath, dbDriver, fileName)
    {
        await dbDriver.rawQuery(
            FileHandler.readFile(
                FileHandler.joinPaths(migrationsPath, fileName),
                {encoding: 'utf8'}
            ).toString()
        );
    }

}

module.exports.DatabaseResetUtility = DatabaseResetUtility;
