/**
 *
 * Reldens - Life Bar State
 *
 * Reads the life bars of a client (the users feature LifebarUi): a player bar (drawn or not, and the life value and
 * total kept on that player sprite) and an object bar (drawn or not, and the life value and total kept by the client
 * for that object key, undefined when the client ignored its updates), and changes the life bar config of that client
 * page only (the client keeps it in one config object, so a server config override would reach the parallel specs).
 *
 */

class LifeBarState
{

    static async fetchPlayerBar(page, sessionId)
    {
        return await page.evaluate((playerKey) => {
            let lifeBarUi = window.reldens.features.featuresList.users.lifeBarUi;
            let playerSprite = window.reldens.getCurrentPlayer().players[playerKey] || {};
            return {
                isDrawn: Boolean(lifeBarUi.lifeBars[playerKey] && lifeBarUi.lifeBars[playerKey].active),
                value: playerSprite[lifeBarUi.barPropertyValue()],
                total: playerSprite[lifeBarUi.barPropertyTotal()]
            };
        }, sessionId);
    }

    static async fetchObjectBar(page, objectKey)
    {
        return await page.evaluate((barKey) => {
            let lifeBarUi = window.reldens.features.featuresList.users.lifeBarUi;
            let barData = lifeBarUi.lifeDataByKey[barKey] || {};
            return {
                isDrawn: Boolean(lifeBarUi.lifeBars[barKey] && lifeBarUi.lifeBars[barKey].active),
                value: barData[lifeBarUi.barPropertyValue()],
                total: barData[lifeBarUi.barPropertyTotal()]
            };
        }, objectKey);
    }

    static async setPageConfig(page, lifeBarValues)
    {
        await page.evaluate(
            (values) => Object.assign(window.reldens.config.get('client/ui/lifeBar'), values),
            lifeBarValues
        );
    }

}

module.exports.LifeBarState = LifeBarState;
