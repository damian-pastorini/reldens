var mysql = require('promise-mysql');
var config = require('../config/database_pool.json');

// config example:
/*
{
  "host": "localhost",
  "user": "root",
  "password": "root",
  "database": "db_name",
  "connectionLimit": 10
}
*/
pool = mysql.createPool(config);

function getSqlConnection()
{
    return pool.getConnection().disposer(function(connection){
        pool.releaseConnection(connection);
    });
}

module.exports = getSqlConnection;
