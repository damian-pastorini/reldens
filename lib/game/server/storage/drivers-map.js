/**
 *
 * Reldens - DriversMap
 *
 */

const {ObjectionJsDataServer, MikroOrmDataServer, PrismaDataServer } = require('@reldens/storage');

module.exports.DriversMap = {
    'objection-js': ObjectionJsDataServer,
    'mikro-orm': MikroOrmDataServer,
    'prisma': PrismaDataServer
};
