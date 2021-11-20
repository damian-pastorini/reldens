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
const { PlayersEntity } = require('../../entities/players-entity');
const { PlayersStateEntity } = require('../../entities/players-state-entity');
const { PlayersStatsEntity } = require('../../entities/players-stats-entity');
const { StatsEntity } = require('../../entities/stats-entity');
const { UsersEntity } = require('../../entities/users-entity');

let rawRegisteredEntities = {
    users: UsersModel,
    players: PlayersModel,
    playerStats: PlayersStatsModel,
    playerState: PlayersStateModel,
    stats: StatsModel
};

let propertiesConfig = {
    parentItemLabel: 'Users',
    icon: 'User'
};

let entitiesConfig = {
    users: UsersEntity.propertiesConfig(propertiesConfig),
    players: PlayersEntity.propertiesConfig(propertiesConfig),
    playerStats: PlayersStatsEntity.propertiesConfig(propertiesConfig),
    playerState: PlayersStateEntity.propertiesConfig(propertiesConfig),
    stats: StatsEntity.propertiesConfig(propertiesConfig)
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;
