/**
 *
 * Reldens - DataServerConfig
 *
 */

const { ErrorManager, Logger } = require('@reldens/utils');

class DataServerConfig
{

    static prepareDbConfig(props)
    {
        // @NOTE: see the .env.dist file in the module root to modify the variables.
        let {host, port, database, user, password, client, connectionLimit, poolMin, poolMax, storageDriver} = props;
        client = client || process.env.RELDENS_DB_CLIENT || 'mysql2';
        storageDriver = storageDriver || process.env.RELDENS_STORAGE_DRIVER || 'objection-js';
        let config = {
            host: host || process.env.RELDENS_DB_HOST || 'localhost',
            port: Number((port || process.env.RELDENS_DB_PORT || 3306)),
            database: database || process.env.RELDENS_DB_NAME || false,
            user: user || process.env.RELDENS_DB_USER || false,
            password: password || process.env.RELDENS_DB_PASSWORD || ''
        };
        if(false === config.user){
            Logger.critical('Missing storage user configuration.', props);
            ErrorManager.error('Missing storage user configuration.');
        }
        if(false === config.database){
            Logger.critical('Missing storage database name configuration.', props);
            ErrorManager.error('Missing storage database name configuration.');
        }
        let limitEnv = Number(process.env.RELDENS_DB_LIMIT || 0);
        if(connectionLimit || 0 < limitEnv){
            config.connectionLimit = Number((connectionLimit || limitEnv));
        }
        let poolConfig = {
            min: Number((poolMin || process.env.RELDENS_DB_POOL_MIN || 2)),
            max: Number((poolMax || process.env.RELDENS_DB_POOL_MAX || 10))
        };
        let connectString = this.createConnectionString(client, config);
        return {client, config, poolConfig, connectString, storageDriver};
    }

    static createConnectionString(client, config)
    {
        let connectString = process.env.RELDENS_DB_CONNECT_STRING || '';
        if('' !== connectString){
            return connectString;
        }
        let connectStringOptions = process.env.RELDENS_DB_CONNECT_STRING_OPTIONS || '';
        return client+'://'
            +config.user
            +(config.password ? ':'+config.password : '')
            +'@'+config.host
            +':'+config.port
            +'/'+config.database
            +(connectStringOptions ? '?'+connectStringOptions : '');
    }
}

module.exports.DataServerConfig = DataServerConfig;
