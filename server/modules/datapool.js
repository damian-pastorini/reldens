const mysql = require('promise-mysql');
const config = require('../config/config');
const pool = mysql.createPool(config.db);

function getSqlConnection()
{
    return pool.getConnection().disposer(function(connection){
        pool.releaseConnection(connection);
    });
}

module.exports = getSqlConnection;
