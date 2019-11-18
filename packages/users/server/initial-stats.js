/**
 *
 * Reldens - InitialStats
 *
 * In order to override any of the default values please create an ".env" file in your project root to change the
 * values you need.
 *
 */

module.exports.InitialStats =  {
    hp: process.env.RELDENS_INITIAL_STATS_HP || 100,
    mp: process.env.RELDENS_INITIAL_STATS_MP || 100,
    stamina: process.env.RELDENS_INITIAL_STATS_STAMINA || 100,
    atk: process.env.RELDENS_INITIAL_STATS_ATK || 100,
    def: process.env.RELDENS_INITIAL_STATS_DEF || 100,
    dodge: process.env.RELDENS_INITIAL_STATS_DODGE || 100,
    speed: process.env.RELDENS_INITIAL_STATS_SPEED || 100
};
