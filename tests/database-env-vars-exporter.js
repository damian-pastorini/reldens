/**
 *
 * Reldens - DatabaseEnvVarsExporter
 *
 */

const { sc } = require('@reldens/utils');

class DatabaseEnvVarsExporter
{

    static apply(config)
    {
        let mappings = {
            dbHost: 'RELDENS_DB_HOST',
            dbPort: 'RELDENS_DB_PORT',
            dbName: 'RELDENS_DB_NAME',
            dbUser: 'RELDENS_DB_USER',
            dbPassword: 'RELDENS_DB_PASSWORD'
        };
        for(let configKey of Object.keys(mappings)){
            if(!sc.hasOwn(config, configKey)){
                continue;
            }
            process.env[mappings[configKey]] = ''+config[configKey];
        }
        if(!sc.hasOwn(config, 'dbName')){
            return false;
        }
        process.env.RELDENS_DB_URL = DatabaseEnvVarsExporter.connectionUrl(config);
        return true;
    }

    static connectionUrl(config)
    {
        let credentials = sc.get(config, 'dbUser', '');
        if('' !== sc.get(config, 'dbPassword', '')){
            credentials = credentials+':'+config.dbPassword;
        }
        return 'mysql://'+credentials
            +'@'+sc.get(config, 'dbHost', 'localhost')
            +':'+sc.get(config, 'dbPort', 3306)
            +'/'+config.dbName;
    }

}

module.exports.DatabaseEnvVarsExporter = DatabaseEnvVarsExporter;
