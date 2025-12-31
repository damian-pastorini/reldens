/**
 *
 * Reldens - GoogleAdSense
 *
 * Documentation: https://support.google.com/adsense/answer/9183549?sjid=16298855257735669764-EU
 *
 * Placeholder for Google AdSense integration.
 *
 */

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class GoogleAdSense
{

    /**
     * @param {Object} providerModel
     * @param {GameManager} gameManager
     */
    constructor(providerModel, gameManager)
    {
        /** @type {GameManager} */
        this.gameManager = gameManager;
        /** @type {Object} */
        this.gameDom = gameManager?.gameDom;
        /** @type {Object} */
        this.events = gameManager?.events;
        /** @type {Window} */
        this.window = gameManager?.gameDom?.getWindow();
        /** @type {Object} */
        this.metaData = providerModel;
    }

}

module.exports.GoogleAdSense = GoogleAdSense;
