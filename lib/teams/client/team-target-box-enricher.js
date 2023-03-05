/**
 *
 * Reldens - TeamTargetBoxEnricher
 *
 */

const { TeamsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class TeamTargetBoxEnricher
{

    static appendTeamInviteButton(gameManager, target, previousTarget, targetName)
    {
        if(
            GameConst.TYPE_PLAYER !== target.type
            || gameManager.getCurrentPlayer().playerId === target.id
            || gameManager.getFeature('teams').fetchTeamPlayerBySessionId(target.id)
        ){
            return false;
        }
        let uiScene = gameManager.gameEngine.uiScene;
        let uiTarget = sc.get(uiScene, 'uiTarget', false);
        if(false === uiTarget){
            Logger.critical('Missing "uiTarget" on uiScene.');
            return false;
        }
        let teamPlayerActionsTemplate = uiScene.cache.html.get('teamPlayerInvite');
        if(!teamPlayerActionsTemplate){
            Logger.critical('Template "teamPlayerInvite" not found.');
            return false;
        }
        gameManager.gameDom.appendToElement(
            '#target-container',
            gameManager.gameEngine.parseTemplate(
                teamPlayerActionsTemplate,
                {
                    // @TODO - BETA - Create translations table with a loader and processor.
                    playerName: targetName,
                    playerId: target.id,
                    inviteLabel: gameManager.config.get('team/titles/inviteLabel', TeamsConst.LABELS.INVITE_BUTTON_LABEL)
                }
            )
        );
        let inviteButton = gameManager.gameDom.getElement('.team-invite-'+target.id+' button');
        inviteButton?.addEventListener('click', () => {
            let sendData = {act: TeamsConst.ACTIONS.TEAM_INVITE, id: target.id};
            gameManager.room.send('*', sendData);
            inviteButton.style.display = 'none';
            gameManager.gameEngine.clearTarget();
        });
    }

}

module.exports.TeamTargetBoxEnricher = TeamTargetBoxEnricher;
