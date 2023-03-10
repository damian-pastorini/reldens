/**
 *
 * Reldens - Registered Models
 *
 */


const { ClanModel } = require('../../models/objection-js/clan-model');
const { ClanLevelsModel } = require('../../models/objection-js/clan-levels-model');
const { ClanLevelsModifiersModel } = require('../../models/objection-js/clan-levels-modifiers-model');
const { ClanMembersModel } = require('../../models/objection-js/clan-members-model');
const { entitiesConfig } = require('../../entities-config');
const { entitiesTranslations } = require('../../entities-translations');

let rawRegisteredEntities = {
    clan: ClanModel,
    clanLevels: ClanLevelsModel,
    clanLevelsModifiers: ClanLevelsModifiersModel,
    clanMembers: ClanMembersModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
