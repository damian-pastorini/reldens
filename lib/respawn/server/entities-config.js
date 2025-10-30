/**
 *
 * Reldens - Entities Config
 *
 */

const { RespawnEntity } = require('./entities/respawn-entity');

let entitiesConfig = {
    respawn: RespawnEntity.propertiesConfig({})
};

module.exports.entitiesConfig = entitiesConfig;
