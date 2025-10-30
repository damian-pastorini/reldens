/**
 *
 * Reldens - Entities Config
 *
 */

const { ClanEntity } = require('./entities/clan-entity');
const { ClanLevelsEntity } = require('./entities/clan-levels-entity');
const { ClanLevelsModifiersEntity } = require('./entities/clan-levels-modifiers-entity');
const { ClanMembersEntity } = require('./entities/clan-members-entity');

let objectsConfig = {parentItemLabel: 'Clan'};

let entitiesConfig = {
    clan: ClanEntity.propertiesConfig(objectsConfig),
    clanLevels: ClanLevelsEntity.propertiesConfig(objectsConfig),
    clanLevelsModifiers: ClanLevelsModifiersEntity.propertiesConfig(objectsConfig),
    clanMembers: ClanMembersEntity.propertiesConfig(objectsConfig)
};

module.exports.entitiesConfig = entitiesConfig;
