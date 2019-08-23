const mysql = require('mysql');
const config = require('../config/config');
const {db: {engine, host, port, database, user, password}} = config;
const connectionString = `${engine}://${user}:${password}@${host}:${port}/${database}`;

class DataLink
{

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
