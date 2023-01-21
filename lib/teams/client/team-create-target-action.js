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
                playerName: targetName,
                playerId: target.id
            }
        );
        gameManager.gameDom.getElement('.team-invite-'+target.id+' button')?.addEventListener('click', () => {
            let sendData = {act: TeamsConst.ACTIONS.TEAM_INVITE, id: target.id};
            console.log({sendData});
            gameManager.room.send('*', sendData);
        });
    }

}

module.exports.TeamTargetActions = TeamTargetActions;