/**
 *
 * Reldens - Entities Config
 *
 */

const { PlayersEntityOverride } = require('./entities/players-entity-override');
const { PlayersStateEntityOverride } = require('./entities/players-state-entity-override');
const { PlayersStatsEntityOverride } = require('./entities/players-stats-entity-override');
const { StatsEntityOverride } = require('./entities/stats-entity-override');
const { UsersEntityOverride } = require('./entities/users-entity-override');
const { UsersLoginEntityOverride } = require('./entities/users-login-entity-override');

module.exports.entitiesConfig = {
    players: PlayersEntityOverride,
    playersState: PlayersStateEntityOverride,
    playersStats: PlayersStatsEntityOverride,
    stats: StatsEntityOverride,
    users: UsersEntityOverride,
    usersLogin: UsersLoginEntityOverride,
};
