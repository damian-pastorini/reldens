/**
 *
 * Reldens - ProvidersList
 *
 */

const { CrazyGames } = require('./providers/crazy-games');
const { GameMonetize } = require('./providers/game-monetize');
const { GoogleAdSense } = require('./providers/google-ad-sense');
const { GameMonetizeSdkOptions } = require('./providers/game-monetize/sdk-options');

module.exports.ProvidersList = {
    crazyGames: {classDefinition: CrazyGames},
    gameMonetize: {classDefinition: GameMonetize, sdkOptionsDefinition: GameMonetizeSdkOptions},
    googleAdSense: {classDefinition: GoogleAdSense}
};
