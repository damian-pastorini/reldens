/**
 *
 * Reldens - PreloaderHandler
 *
 * Handles preloading of scores UI templates during the game initialization phase.
 *
 */

const { ScoresConst } = require('../constants');

/**
 * @typedef {import('../../game/client/scene-preloader').ScenePreloader} ScenePreloader
 */
class PreloaderHandler
{

    /**
     * @param {ScenePreloader} uiScene
     */
    loadContents(uiScene)
    {
        let scoresTemplatePath = '/assets/features/scores/templates/';
        uiScene.load.html(ScoresConst.KEY, scoresTemplatePath+'ui-scores.html');
        uiScene.load.html(ScoresConst.TEMPLATES.SCORES_TABLE, scoresTemplatePath+'ui-scores-table.html');
    }

}

module.exports.PreloaderHandler = PreloaderHandler;
