/**
 *
 * Reldens - GoogleAdSense
 *
 * Documentation: https://support.google.com/adsense/answer/9183549?sjid=16298855257735669764-EU
 *
 */

class GoogleAdSense
{
    constructor(providerModel, gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = gameManager?.gameDom;
        this.events = gameManager?.events;
        this.window = gameManager?.gameDom?.getWindow();
        this.metaData = providerModel;
    }

}

module.exports.GoogleAdSense = GoogleAdSense;
