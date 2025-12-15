/**
 *
 * Reldens - TemplatesHandler
 *
 * Handles preloading of team and clan UI templates during the game initialization phase.
 *
 */

const { TeamsConst } = require('../constants');

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
        let teamsTemplatePath = '/assets/features/teams/templates/';
        preloadScene.load.html(TeamsConst.KEY, teamsTemplatePath+'ui-teams.html');
        preloadScene.load.html(TeamsConst.CLAN_KEY, teamsTemplatePath+'ui-clan.html');
        preloadScene.load.html('teamPlayerInvite', teamsTemplatePath+'team-invite.html');
        preloadScene.load.html('teamPlayerAccept', teamsTemplatePath+'team-accept.html');
        preloadScene.load.html('teamRemove', teamsTemplatePath+'team-remove.html');
        preloadScene.load.html('teamContainer', teamsTemplatePath+'team-container.html');
        preloadScene.load.html('teamPlayerData', teamsTemplatePath+'team-player-data.html');
        preloadScene.load.html('clanCreate', teamsTemplatePath+'clan-create.html');
        preloadScene.load.html('clanPlayerInvite', teamsTemplatePath+'clan-invite.html');
        preloadScene.load.html('clanPlayerAccept', teamsTemplatePath+'clan-accept.html');
        preloadScene.load.html('clanRemove', teamsTemplatePath+'clan-remove.html');
        preloadScene.load.html('clanContainer', teamsTemplatePath+'clan-container.html');
        preloadScene.load.html('clanPlayerData', teamsTemplatePath+'clan-player-data.html');
        preloadScene.load.html('clanMemberData', teamsTemplatePath+'clan-member-data.html');
        preloadScene.load.html('teamsSharedProperty', teamsTemplatePath+'shared-property.html');
    }

}
module.exports.TemplatesHandler = TemplatesHandler;
