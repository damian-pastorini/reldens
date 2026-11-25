/**
 *
 * Reldens - DatabaseResetUtility
 *
 * Resets a tests database: creates it first when it does not exist (utf8mb4, only for a name of letters, numbers and
 * underscores; a database user without the create privilege only logs it and the reset needs the existing database),
 * then drops every table, installs the schema and runs the seed files.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');
const { Utils } = require('./utils');

class DatabaseResetUtility
{

    constructor(config, seedFiles = false)
    {
        this.config = config;
        this.databaseNamePattern = /^[A-Za-z0-9_]+$/;
        this.productionPath = FileHandler.joinPaths(process.cwd(), 'migrations', 'production');
        this.developmentPath = FileHandler.joinPaths(process.cwd(), 'migrations', 'development');
        this.fixturesPath = FileHandler.joinPaths(process.cwd(), 'tests', 'fixtures');
        this.schemaFiles = [
            {path: this.fixturesPath, file: 'database-drop-tables.sql', label: 'Drop tables'},
            {path: this.productionPath, file: 'reldens-install-v4.0.0.sql', label: 'Install schema'}
        ];
        this.seedFiles = seedFiles || [
            {path: this.productionPath, file: 'reldens-basic-config-v4.0.0.sql', label: 'Basic config'},
            {path: this.developmentPath, file: 'reldens-test-sample-data-v4.0.0.sql', label: 'Test sample data'}
        ];
    }

    async createDatabase()
    {
        if(!this.databaseNamePattern.test(String(this.config.dbName))){
            Logger.log(100, '', 'Database create skipped, invalid database name: '+this.config.dbName);
            return false;
        }
        let serverDriver = Utils.createDataServer(Object.assign({}, this.config, {dbName: ''}));
        if(!await serverDriver.connect()){
            Logger.log(100, '', 'Database server connection failed');
            return false;
        }
        let isCreated = true;
        try {
            await serverDriver.rawQuery(
                'CREATE DATABASE IF NOT EXISTS `'+this.config.dbName+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
            );
        } catch(error){
            Logger.log(100, '', 'Database create failed, the reset needs an existing database: '+error.message);
            isCreated = false;
        }
        await serverDriver.disconnect();
        return isCreated;
    }

    async resetDatabase()
    {
        await this.createDatabase();
        let dbDriver = Utils.createDataServer(this.config);
        if(!await dbDriver.connect()){
            Logger.log(100, '', 'Database connection failed');
            return false;
        }
        for(let seed of [...this.schemaFiles, ...this.seedFiles]){
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
