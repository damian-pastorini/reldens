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

    constructor(config, seedFiles = false)
    {
        this.config = config;
        this.productionPath = FileHandler.joinPaths(process.cwd(), 'migrations', 'production');
        this.developmentPath = FileHandler.joinPaths(process.cwd(), 'migrations', 'development');
        this.seedFiles = seedFiles || [
            {path: this.productionPath, file: 'reldens-basic-config-v4.0.0.sql', label: 'Basic config'},
            {path: this.developmentPath, file: 'reldens-test-sample-data-v4.0.0.sql', label: 'Test sample data'}
        ];
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
        for(let seed of this.seedFiles){
            let queryContent = FileHandler.readFile(FileHandler.joinPaths(seed.path, seed.file), {encoding: 'utf8'});
            if(!queryContent){
                Logger.log(100, '', 'Database reset failed: cannot read '+seed.file);
                return false;
            }
            try {
                await dbDriver.rawQuery(queryContent.toString());
            } catch(error){
                Logger.log(100, '', 'Database reset failed: '+error.message);
                return false;
            }
            Logger.log(100, '', seed.label+' executed');
        }
        Logger.log(100, '', 'Database reset completed successfully');
        return true;
    }

}

module.exports.DatabaseResetUtility = DatabaseResetUtility;
