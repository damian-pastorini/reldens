/**
 *
 * Reldens - InitialGameDataEnricher
 *
 * Enriches the initial game data with user locale information.
 *
 */

/**
 * @typedef {import('@colyseus/core').Client} Client
 */
class InitialGameDataEnricher
{

    /**
     * @param {Object} superInitialGameData
     * @param {Object} roomGame
     * @param {Client} client
     * @param {Object} userModel
     * @returns {Promise<boolean|void>}
     */
    static async withLocale(superInitialGameData, roomGame, client, userModel)
    {
        let eventData = {superInitialGameData, roomGame, client, userModel};
        let startEvent = Object.assign({continueProcess: true}, eventData);
        roomGame.events.emit('reldens.beforeEnrichUserWithLocale', startEvent);
        if(!startEvent.continueProcess){
            return false;
        }
        let userLocale = await roomGame.dataServer.getEntity('usersLocale').loadOneByWithRelations(
            'user_id',
            userModel.id,
            ['related_locale']
        );
        if(!userLocale?.locale){
            return true;
        }
        superInitialGameData.userLocale = userLocale.locale;
        roomGame.events.emit('reldens.afterEnrichPlayerWithLocale', eventData);
    }

}

module.exports.InitialGameDataEnricher = InitialGameDataEnricher;
