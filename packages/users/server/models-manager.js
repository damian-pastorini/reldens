/**
 *
 * Reldens - Users - ModelsManager
 *
 */

const { StatsModel } = require('./stats-model');
const { PlayersStatsModel } = require('./players-stats-model');

module.exports.ModelsManager = {
    // stats entity data model:
    stats: StatsModel,
    // relation between player and stats:
    playerStats: PlayersStatsModel
};
