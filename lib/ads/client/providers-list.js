/**
 *
 * Reldens - ProvidersList
 *
 */

const { CrazyGames } = require('./providers/crazy-games');
const { GameMonetize } = require('./providers/game-monetize');
const { GoogleAdSense } = require('./providers/google-ad-sense');

module.exports.ProvidersList = {
    crazyGames: CrazyGames,
    gameMonetize: GameMonetize,
    googleAdSense: GoogleAdSense
};
