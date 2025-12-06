/**
 *
 * Reldens - Entities Config
 *
 */

const { ConfigEntityOverride } = require('./entities/config-entity-override');
const { ConfigTypesEntityOverride } = require('./entities/config-types-entity-override');

module.exports.entitiesConfig = {
    config: ConfigEntityOverride,
    configTypes: ConfigTypesEntityOverride,
};
