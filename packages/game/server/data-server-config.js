/**
 *
 * Reldens - DataServerConfig
 *
 */

const { ErrorManager } = require('@reldens/utils');

class DataServerConfig
{

    static prepareDbConfig(props)
    {
        // @NOTE: see the .env.dist file in the module root to modify the variables.
        let {host, port, database, user, password, client, connectionLimit, poolMin, poolMax, storageDriver} = props;
        client = client || process.env.RELDENS_DB_CLIENT || 'mysql';
        storageDriver = storageDriver || process.env.RELDENS_STORAGE_DRIVER || 'objection-js';
        let config = {
            host: host || process.env.RELDENS_DB_HOST || 'localhost',
            port: Number((port || process.env.RELDENS_DB_PORT || 3306)),
            database: database || process.env.RELDENS_DB_NAME || false,
            user: user || process.env.RELDENS_DB_USER || false,
            password: password || process.env.RELDENS_DB_PASSWORD || ''
        };
        // check for errors:
        if(!config.user){
            ErrorManager.error('Missing storage user configuration.');
        }
        if(!config.database){
            ErrorManager.error('Missing storage database name configuration.');
        }
        let limitEnv = process.env.RELDENS_DB_LIMIT;
        if(connectionLimit || typeof limitEnv !== 'undefined'){
            config.connectionLimit = Number((connectionLimit || limitEnv));
        }
        let poolConfig = {
            min: Number((poolMin || process.env.RELDENS_DB_POOL_MIN || 2)),
            max: Number((poolMax || process.env.RELDENS_DB_POOL_MAX || 10))
        };
        let pass = config.password ? ':' + config.password : '';
        let connectString = `${client}://${config.user}${pass}@${config.host}:${config.port}/${config.database}`;
        return {client, config, poolConfig, connectString, storageDriver};
    }

}

module.exports.DataServerConfig = DataServerConfig;
