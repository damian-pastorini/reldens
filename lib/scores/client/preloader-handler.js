/**
 *
 * Reldens - PreloaderHandler
 *
 */

const { ScoresConst } = require('../constants');

class PreloaderHandler
{

    loadContents(uiScene)
    {
        let scoresTemplatePath = '/assets/features/scores/templates/';
        uiScene.load.html(ScoresConst.KEY, scoresTemplatePath+'ui-scores.html');
        uiScene.load.html(ScoresConst.TEMPLATES.SCORES_TABLE, scoresTemplatePath+'ui-scores-table.html');
    }

}

module.exports.PreloaderHandler = PreloaderHandler;
