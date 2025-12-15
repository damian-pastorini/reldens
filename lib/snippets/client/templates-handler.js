/**
 *
 * Reldens - TemplatesHandler
 *
 * Handles preloading of snippet-related HTML templates.
 *
 */

const { SnippetsConst } = require('../constants');

/**
 * @typedef {import('../../game/client/scene-preloader').ScenePreloader} ScenePreloader
 */
class TemplatesHandler
{

    /**
     * @param {ScenePreloader} preloadScene
     */
    static preloadTemplates(preloadScene)
    {
        let teamsTemplatePath = '/assets/features/snippets/templates/';
        preloadScene.load.html(SnippetsConst.KEY, teamsTemplatePath+'ui-snippets.html');
    }

}
module.exports.TemplatesHandler = TemplatesHandler;
