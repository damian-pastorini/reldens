/**
 *
 * Reldens - DataServer
 *
 * This module handle the database connection and queries.
 *
 */

const { Model } = require('objection');
const Knex = require('knex');
const { Logger } = require('../logger');
const { ErrorManager } = require('../error-manager.js');

class DataServer
{

    initialize()
    {
        // db config:
        this.prepareDbConfig();
        // check for errors:
        if(!this.config.user){
            ErrorManager.error('Missing storage user configuration.');
        }
        if(!this.config.database){
            ErrorManager.error('Missing storage database name configuration.');
        }
        // log connection string before prepare objection (in case you have some missing data in the config):
        let {host, port, database, user, password} = this.config;
        Logger.info(`${this.client}://${user}${(password ? ':'+password : '')}@${host}:${port}/${database}`);
        try {
            this.prepareObjection();
            Logger.info('Objection JS ready!');
        } catch (err) {
            ErrorManager.error('Objection JS - ERROR: '+err);
        }
    }

    prepareDbConfig()
    {
        // @NOTE: see the sample.env file in the module root for the variables setup.
        this.client = process.env.RELDENS_DB_CLIENT || 'mysql';
        this.config = {
            host: process.env.RELDENS_DB_HOST || 'localhost',
            port: Number(process.env.RELDENS_DB_PORT) || 3306,
            database: process.env.RELDENS_DB_NAME || false,
            user: process.env.RELDENS_DB_USER || false,
            password: process.env.RELDENS_DB_PASSWORD || '',
            connectionLimit: Number(process.env.RELDENS_DB_LIMIT) || 10
        };
    }

    prepareObjection()
    {
        // initialize knex, the query builder:
        this.knex = Knex({client: this.client, connection: this.config});
        // give the knex instance to Objection.
        this.model = Model.knex(this.knex);
    }

}

module.exports.DataServer = new DataServer();
