/**
 *
 * Reldens - DataServer
 *
 * This module handle the database connection and queries.
 *
 */

const { Model } = require('objection');
const Knex = require('knex');

class DataServer
{

    /**
     * If dbConfig is not present then everything will be stopped.
     *
     * @param dbConfig
     */
    constructor(dbConfig = false)
    {
        // database configuration can be manually created by passing the connection data or using the general config.
        if(!dbConfig){
            // @TODO: use a getter.
            dbConfig = {
                // @TODO: - Seiyria - all of these should be documented somewhere. See landoftherair/landoftherair
                //   README for an example
                client: process.env.RELDENS_DB_CLIENT || 'mysql',
                host: process.env.RELDENS_DB_HOST || '10.0.2.2',
                port: Number(process.env.RELDENS_DB_PORT) || 3306,
                database: process.env.RELDENS_DB_NAME || 'reldens',
                user: process.env.RELDENS_DB_USER || 'reldens',
                password: process.env.RELDENS_DB_PASSWORD || 'reldens',
                connectionLimit: Number(process.env.RELDENS_DB_LIMIT) || 10
            };
        }
        // if the database config is present:
        if(dbConfig && this.checkParameters(dbConfig)){
            this.config = dbConfig;
            let {client, host, port, database, user, password} = dbConfig;
            this.connectionString = `${client}://${user}${(password ? ':'+password : '')}@${host}:${port}/${database}`;
            console.log('INFO - Connected to DataServer:', this.connectionString);
        } else {
            throw new Error('ERROR - Missing database full configuration.');
        }
        this.prepareObjection();
        console.log('INFO - Objection Model ready!');
    }

    /**
     * Check the database configured parameters.
     *
     * @param dbConfig
     * @returns {boolean}
     */
    checkParameters(dbConfig)
    {
        // check the parameters required for the connection:
        if(!dbConfig.hasOwnProperty('client')){
            throw new Error('ERROR - Missing database client configuration.');
        }
        if(!dbConfig.hasOwnProperty('host')){
            throw new Error('ERROR - Missing database host configuration.');
        }
        if(!dbConfig.hasOwnProperty('port')){
            throw new Error('ERROR - Missing database port configuration.');
        }
        if(!dbConfig.hasOwnProperty('host')){
            throw new Error('ERROR - Missing database host configuration.');
        }
        if(!dbConfig.hasOwnProperty('database')){
            throw new Error('ERROR - Missing database name configuration.');
        }
        if(!dbConfig.hasOwnProperty('user')){
            throw new Error('ERROR - Missing database user configuration.');
        }
        return true;
    }

    prepareObjection()
    {
        // initialize knex, the query builder:
        this.knex = Knex({
            client: this.config.client,
            connection: {
                host : this.config.host,
                port: this.config.port,
                user : this.config.user,
                password : this.config.password,
                database : this.config.database
            }
        });
        // give the knex instance to Objection.
        this.model = Model.knex(this.knex);
    }

}

module.exports = DataServer;
