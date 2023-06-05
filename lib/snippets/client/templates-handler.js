/**
 *
 * Reldens - TemplatesHandler
 *
 */

const { SnippetsConst } = require('../constants');

class TemplatesHandler
{

    static preloadTemplates(preloadScene)
    {
        let teamsTemplatePath = '/assets/features/snippets/templates/';
        preloadScene.load.html(SnippetsConst.KEY, teamsTemplatePath+'ui-snippets.html');
    }

}
module.exports.TemplatesHandler = TemplatesHandler;
