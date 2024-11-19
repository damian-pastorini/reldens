/**
 *
 * Reldens - PreloaderHandler
 *
 */

const { RewardsConst } = require('../constants');

class PreloaderHandler
{

    loadContents(uiScene)
    {
        let rewardsTemplatePath = '/assets/features/rewards/templates/';
        uiScene.load.html(RewardsConst.KEY, rewardsTemplatePath+'ui-rewards.html');
        uiScene.load.html(RewardsConst.TEMPLATES.REWARDS_LIST, rewardsTemplatePath+'ui-rewards-list.html');
    }

}

module.exports.PreloaderHandler = PreloaderHandler;
