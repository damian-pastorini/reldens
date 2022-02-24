/**
 *
 * Reldens - Entities Config
 *
 */

const { PlayersEntity } = require('./entities/players-entity');
const { PlayersStateEntity } = require('./entities/players-state-entity');
const { PlayersStatsEntity } = require('./entities/players-stats-entity');
const { StatsEntity } = require('./entities/stats-entity');
const { UsersEntity } = require('./entities/users-entity');

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

module.exports.entitiesConfig = entitiesConfig;
