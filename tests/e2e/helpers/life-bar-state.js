/**
 *
 * Reldens - Life Bar State
 *
 * Reads the life bars of a client (the users feature LifebarUi): a player bar (drawn or not, still kept by the client
 * or removed, and the life value and total kept on that player sprite), the own player bar (drawn, visible, drawn on
 * the UI scene, the fixed position kept by the client and the screen size it is computed from), the count of the drawn
 * bars (0 when the life bars are off and the client keeps none) and an object bar (drawn or not, and the life value and
 * total kept by the client for that object key, undefined when the client ignored its updates), and changes the life
 * bar config of that client page only (the client keeps it in one config object, so a server config override would
 * reach the parallel specs).
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
                isKept: Object.keys(lifeBarUi.lifeBars).includes(playerKey),
                value: playerSprite[lifeBarUi.barPropertyValue()],
                total: playerSprite[lifeBarUi.barPropertyTotal()]
            };
        }, sessionId);
    }

    static async fetchOwnBar(page)
    {
        return await page.evaluate(() => {
            let lifeBarUi = window.reldens.features.featuresList.users.lifeBarUi;
            let lifeBar = lifeBarUi.lifeBars[window.reldens.getCurrentPlayer().playerId];
            let screenSize = window.reldens.gameEngine.getCurrentScreenSize(window.reldens);
            return {
                isDrawn: Boolean(lifeBar && lifeBar.active),
                isVisible: Boolean(lifeBar && lifeBar.active && lifeBar.visible),
                isOnUiScene: Boolean(lifeBar && lifeBar.active) && window.reldens.getActiveScenePreloader() === lifeBar.scene,
                x: lifeBarUi.fixedPositionX,
                y: lifeBarUi.fixedPositionY,
                screenWidth: screenSize.newWidth,
                screenHeight: screenSize.newHeight
            };
        });
    }

    static async fetchDrawnBarsCount(page)
    {
        return await page.evaluate(() => {
            let lifeBars = window.reldens.features.featuresList.users.lifeBarUi.lifeBars || {};
            return Object.keys(lifeBars).filter(barKey => lifeBars[barKey].active).length;
        });
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
