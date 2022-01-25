/**
 *
 * Reldens - Registered Entities
 *
 */

const { ConfigModel } = require('./config-model');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    config: ConfigModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
