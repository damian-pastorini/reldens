/**
 *
 * Reldens - GenericDriverInstallation
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class GenericDriverInstallation
{

    async executeRawQuery(dbDriver, migrationsPath, fileName)
    {
        await dbDriver.rawQuery(FileHandler.readFile(FileHandler.joinPaths(migrationsPath, fileName)));
    }

    async executeInstallation(selectedDriver, dbConfig, templateVariables, migrationsPath)
    {
        try {
            let dbDriver = new selectedDriver(dbConfig);
            if(!await dbDriver.connect()){
                return {success: false, error: 'connection-failed'};
            }
            if(!sc.isObjectFunction(dbDriver, 'rawQuery')){
                return {success: false, error: 'raw-query-not-found'};
            }
            await this.executeRawQuery(dbDriver, migrationsPath, 'reldens-install-v4.0.0.sql');
            Logger.info('Installed tables.');
            if('1' === templateVariables['db-basic-config']){
                await this.executeRawQuery(dbDriver, migrationsPath, 'reldens-basic-config-v4.0.0.sql');
                Logger.info('Installed basic-config.');
            }
            if('1' === templateVariables['db-sample-data']){
                await this.executeRawQuery(dbDriver, migrationsPath, 'reldens-sample-data-v4.0.0.sql');
                Logger.info('Installed sample-data.');
            }
            return {success: true, dbDriver: dbDriver};
        } catch (error) {
            Logger.critical('There was an error during the installation process.', error);
            return {success: false, error: 'db-installation-process-failed'};
        }
    }

}

module.exports.GenericDriverInstallation = GenericDriverInstallation;
