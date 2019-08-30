const mysql = require('mysql');
const config = require('../config/config');
const {engine, host, port, database, user, password} = config;

class DataLink
{

    constructor(dbConfig = false)
    {
        // if the database config is present:
        if(dbConfig && this.checkParameters(dbConfig)){
            this.config = dbConfig;
        }
        this.connectionString = `${engine}://${user}${(password ? ':'+password : '')}@${host}:${port}/${database}`;
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
        if(!dbConfig.hasOwnProperty('engine')){
            throw new Error("Missing database engine configuration.");
        }
        if(!dbConfig.hasOwnProperty('host')){
            throw new Error("Missing database host configuration.");
        }
        if(!dbConfig.hasOwnProperty('port')){
            throw new Error("Missing database port configuration.");
        }
        if(!dbConfig.hasOwnProperty('host')){
            throw new Error("Missing database host configuration.");
        }
        if(!dbConfig.hasOwnProperty('database')){
            throw new Error("Missing database name configuration.");
        }
        if(!dbConfig.hasOwnProperty('user')){
            throw new Error("Missing database user configuration.");
        }
        return true;
    }

    query(sql, args = {})
    {
        return new Promise((resolve, reject) => {
            let connection = mysql.createConnection(connectionString);
            connection.query(sql, args, (err, rows) => {
                // in any case first close the connection:
                connection.end();
                // then reject or resolve:
                if(err){
                    return reject(err);
                }
                return resolve(rows);
            });
        });
    }

}

module.exports = new DataLink();
