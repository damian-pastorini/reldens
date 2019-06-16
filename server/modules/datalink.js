const mysql = require('mysql');
const config = require('../config/config');
const {db: {engine, host, port, database, user, password}} = config;
const connectionString = `${engine}://${user}:${password}@${host}:${port}/${database}`;

class DataLink
{

    constructor()
    {
        this.connection = mysql.createConnection(connectionString);
    }

    query(sql, args)
    {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, args, (err, rows) => {
                if(err){
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }

    close()
    {
        return new Promise((resolve, reject) => {
            this.connection.end(err => {
                if(err){
                    return reject(err);
                }
                resolve();
            });
        });
    }

}

module.exports = new DataLink();
