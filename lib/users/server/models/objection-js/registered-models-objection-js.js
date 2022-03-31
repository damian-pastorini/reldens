/**
 *
 * Reldens - UserEntities
 *
 */

const { UsersModel } = require('./users-model');
const { StatsModel } = require('./stats-model');
const { PlayersModel } = require('./players-model');
const { PlayersStatsModel } = require('./players-stats-model');
const { PlayersStateModel } = require('./players-state-model');
const { entitiesConfig } = require('../../entities-config');

let rawRegisteredEntities = {
    users: UsersModel,
    players: PlayersModel,
    playerStats: PlayersStatsModel,
    playerState: PlayersStateModel,
    stats: StatsModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
