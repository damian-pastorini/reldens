/**
 *
 * Reldens - DriversMap
 *
 * Map of storage driver keys to DataServer class constructors.
 * Used by the installer and entity generators to resolve the driver from a key string.
 * Supports ObjectionJS (default), MikroORM, and Prisma storage drivers.
 *
 */

const {ObjectionJsDataServer, MikroOrmDataServer, PrismaDataServer } = require('@reldens/storage');

/**
 * @typedef {import('@reldens/storage').ObjectionJsDataServer} ObjectionJsDataServer
 * @typedef {import('@reldens/storage').MikroOrmDataServer} MikroOrmDataServer
 * @typedef {import('@reldens/storage').PrismaDataServer} PrismaDataServer
 *
 * Map of storage driver keys to DataServer class constructors.
 * @type {Object<string, typeof ObjectionJsDataServer | typeof MikroOrmDataServer | typeof PrismaDataServer>}
 */
module.exports.DriversMap = {
    'objection-js': ObjectionJsDataServer,
    'mikro-orm': MikroOrmDataServer,
    'prisma': PrismaDataServer
};
