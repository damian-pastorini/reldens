var mysql = require('promise-mysql');

pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'admin22',
    database: 'questworld',
    connectionLimit: 10
});

function getSqlConnection() {
    return pool.getConnection().disposer(function(connection) {
        pool.releaseConnection(connection);
    });
}

module.exports = getSqlConnection;
