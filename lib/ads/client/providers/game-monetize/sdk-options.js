/**
 *
 * Reldens - GameMonetizeSdkOptions
 *
 * Sets the window.SDK_OPTIONS the GameMonetize SDK reads when its script loads (the game ID and the SDK events
 * callback), so it is set before the SDK script is appended, also when the script is appended with the page before the
 * login. The SDK events are emitted on the events manager, where the GameMonetize provider created after the login
 * listens them (GameMonetize.listenSdkEvents).
 *
 */

const { AdsConst } = require('../../../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class GameMonetizeSdkOptions
{

    /**
     * @param {Object} providerModel
     * @param {Object} gameDom
     * @param {EventsManager} events
     * @returns {boolean}
     */
    static set(providerModel, gameDom, events)
    {
        let gameId = providerModel.gameId;
        if(!gameId){
            Logger.error('GameMonetize - The game ID is required to set the SDK options.');
            return false;
        }
        gameDom.getWindow().SDK_OPTIONS = {
            gameId,
            onEvent: async (event) => await events.emit(AdsConst.EVENTS.GAME_MONETIZE_SDK, event)
        };
        return true;
    }

}

module.exports.GameMonetizeSdkOptions = GameMonetizeSdkOptions;
