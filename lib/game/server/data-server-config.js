/**
 *
 * Reldens - DataServerConfig
 *
 * Static utility class for preparing database configuration from environment variables and provided
 * properties. Handles connection string creation, pool configuration, storage driver selection, and
 * validation of required database credentials. Supports MySQL, MySQL2, and MongoDB client types with
 * configurable connection limits and pool sizes.
 *
 */

const { ErrorManager, Logger } = require('@reldens/utils');

class DataServerConfig
{

    /**
     * @param {Object} props
     * @param {string} [props.host]
     * @param {number} [props.port]
     * @param {string} [props.database]
     * @param {string} [props.user]
     * @param {string} [props.password]
     * @param {string} [props.client]
     * @param {number} [props.connectionLimit]
     * @param {number} [props.poolMin]
     * @param {number} [props.poolMax]
     * @param {string} [props.storageDriver]
     * @returns {Object}
     */
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

    /**
     * @param {string} client
     * @param {Object} config
     * @returns {string}
     */
    static createConnectionString(client, config)
    {
        let connectString = process.env.RELDENS_DB_URL || '';
        if('' !== connectString){
            return connectString;
        }
        let connectStringOptions = process.env.RELDENS_DB_URL_OPTIONS || '';
        let provider = client;
        if(-1 !== provider.indexOf('mysql')){
            provider = 'mysql';
        }
        return provider+'://'
            +config.user
            +(config.password ? ':'+config.password : '')
            +'@'+config.host
            +':'+config.port
            +'/'+config.database
            +(connectStringOptions ? '?'+connectStringOptions : '');
    }
}

module.exports.DataServerConfig = DataServerConfig;
