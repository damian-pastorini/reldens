/**
 *
 * Reldens - Teams Client Plugin
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { PluginInterface } = require('../../features/plugin-interface');
const { TeamTargetActions } = require('./team-create-target-action');
const { TeamMessageListener } = require('./team-message-listener');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class TeamsPlugin extends PluginInterface
{

    setup(props)
    {
        this.teamTargetActions = new TeamTargetActions();
        this.gameManager = sc.get(props, 'gameManager', false);
        // @NOTE: the tradeUi works as preload for the trade template which at the end is a dialog-box.
        this.teamsUi = new UserInterface(this.gameManager, {id: TeamsConst.KEY, type: TeamsConst.KEY});
        if(!this.gameManager){
            Logger.error('Game Manager undefined in TeamsPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in TeamsPlugin.');
        }
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            this.preloadTemplates(preloadScene);
        });
        this.events.on('reldens.gameEngineShowTarget', (gameEngine, target, previousTarget, targetName) => {
            this.teamTargetActions.showTeamInviteAction(this.gameManager, target, previousTarget, targetName);
        });
        this.gameManager.config.client.message.listeners[TeamsConst.KEY] = new TeamMessageListener();
    }

    preloadTemplates(preloadScene)
    {
        let teamsTemplatePath = 'assets/features/teams/templates/';
        preloadScene.load.html(TeamsConst.KEY, teamsTemplatePath+'ui-teams.html');
        preloadScene.load.html(TeamsConst.CLAN_KEY, teamsTemplatePath+'ui-clan.html');
        preloadScene.load.html('teamPlayerInvite', teamsTemplatePath+'team-invite.html');
        preloadScene.load.html('teamPlayerAccept', teamsTemplatePath+'team-accept.html');
        preloadScene.load.html('teamPlayerData', teamsTemplatePath+'team-player-data.html');
    }

}

module.exports.TeamsPlugin = TeamsPlugin;
