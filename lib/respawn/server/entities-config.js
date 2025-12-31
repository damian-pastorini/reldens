/**
 *
 * Reldens - Entities Config
 *
 */

const { RespawnEntityOverride } = require('./entities/respawn-entity-override');

let entitiesConfig = {
    respawn: RespawnEntityOverride
};

module.exports.entitiesConfig = entitiesConfig;
