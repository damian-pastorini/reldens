var mysql = require('promise-mysql');
var config = require('../config/database_pool.json');

pool = mysql.createPool(config);

function getSqlConnection()
{
    return pool.getConnection().disposer(function(connection){
        pool.releaseConnection(connection);
    });
}

module.exports = getSqlConnection;
