const fs = require('fs');

exports.up = function(knex) {
    let sql = fs.readFileSync(__dirname+'/reldens-install-v4.0.0.sql').toString();
    return knex.raw(sql);
};

// eslint-disable-next-line no-unused-vars
exports.down = function(knex) {
    // nothing to do in the first version.
};
