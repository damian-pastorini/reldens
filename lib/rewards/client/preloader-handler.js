/**
 *
 * Reldens - PreloaderHandler
 *
 * Handles preloading of rewards UI templates in the client.
 *
 */

const { RewardsConst } = require('../constants');

class PreloaderHandler
{

    /**
     * @param {Object} uiScene
     */
    loadContents(uiScene)
    {
        let rewardsTemplatePath = '/assets/features/rewards/templates/';
        uiScene.load.html(RewardsConst.KEY, rewardsTemplatePath+'ui-rewards.html');
        uiScene.load.html(RewardsConst.TEMPLATES.REWARDS_LIST, rewardsTemplatePath+'ui-rewards-list.html');
    }

}

module.exports.PreloaderHandler = PreloaderHandler;
