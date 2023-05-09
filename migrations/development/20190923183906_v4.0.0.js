const fs = require('fs');

exports.up = function(knex) {
    let sql = fs.readFileSync(__dirname+'/reldens-install-v4.0.0.sql').toString();
    return knex.raw(sql);
};

exports.down = function(knex) {
    // nothing to do in the first version.
};
