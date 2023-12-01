/**
 *
 * Reldens - DriversMap
 *
 */

const {ObjectionJsDataServer, MikroOrmDataServer} = require('@reldens/storage');

module.exports.DriversMap = {
    'objection-js': ObjectionJsDataServer,
    'mikro-orm': MikroOrmDataServer
};
