/**
 *
 * Reldens - Entities Config
 *
 */

const { ClanEntityOverride } = require('./entities/clan-entity-override');
const { ClanLevelsModifiersEntityOverride } = require('./entities/clan-levels-modifiers-entity-override');

module.exports.entitiesConfig = {
    clan: ClanEntityOverride,
    clanLevelsModifiers: ClanLevelsModifiersEntityOverride
};
