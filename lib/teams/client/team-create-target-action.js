/**
 *
 * Reldens - TradeTargetAction
 *
 */

const { TeamsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { sc } = require('@reldens/utils');

class TeamTargetActions
{

    showTeamInviteAction(gameManager, target, previousTarget, targetName)
    {
        // @TODO - Return false if player is already in the current team.
        if(GameConst.TYPE_PLAYER !== target.type || gameManager.getCurrentPlayer().playerId === target.id){
            return false;
        }
        let uiScene = gameManager.gameEngine.uiScene;
        let uiTarget = sc.get(uiScene, 'uiTarget', false);
        if(false === uiTarget){
            return false;
        }
        let teamPlayerActionsTemplate = uiScene.cache.html.get('teamPlayerInvite');
        uiTarget.getChildByID('box-target').style.display = 'block';
        uiTarget.getChildByID('target-container').innerHTML += gameManager.gameEngine.parseTemplate(
            teamPlayerActionsTemplate,
            {
                // @TODO - BETA - Create translations table with a loader and processor.
                playerName: targetName,
                playerId: target.id,
                inviteLabel: gameManager.config.get('team/titles/inviteLabel', TeamsConst.LABELS.INVITE_BUTTON_LABEL)
            }
        );
        gameManager.gameDom.getElement('.team-invite-'+target.id+' button')?.addEventListener('click', () => {
            let sendData = {act: TeamsConst.ACTIONS.TEAM_INVITE, id: target.id};
            gameManager.room.send('*', sendData);
        });
    }

}

module.exports.TeamTargetActions = TeamTargetActions;