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

    static appendClanInviteButton(gameManager, target, previousTarget, targetName)
    {
        let currentPlayer = gameManager.getCurrentPlayer();
        if(!currentPlayer.clan){
            return false;
        }
        if(!this.targetIsValidPlayer(target, currentPlayer)){
            return false;
        }
        if(currentPlayer.clan.members[target.id]){
            return false;
        }
        return this.appendInviteButton('clan', target, gameManager, targetName);
    }

    static appendTeamInviteButton(gameManager, target, previousTarget, targetName)
    {
        if(!this.targetIsValidPlayer(target, gameManager.getCurrentPlayer())){
            return false;
        }
        if(gameManager.getFeature('teams').fetchTeamPlayerBySessionId(target.id)){
            return false;
        }
        return this.appendInviteButton('team', target, gameManager, targetName);
    }

    static appendInviteButton(type, target, gameManager, targetName)
    {
        let uiScene = gameManager.gameEngine.uiScene;
        let uiTarget = sc.get(uiScene, 'uiTarget', false);
        if(false === uiTarget){
            Logger.critical('Missing "uiTarget" on uiScene.');
            return false;
        }
        let teamPlayerActionsTemplate = uiScene.cache.html.get(type+'PlayerInvite');
        if(!teamPlayerActionsTemplate){
            Logger.critical('Template "'+type+'PlayerInvite" not found.');
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
                    inviteLabel: gameManager.config.get(
                        type+'/titles/inviteLabel',
                        TeamsConst.LABELS[type.toUpperCase()].INVITE_BUTTON_LABEL
                    )
                }
            )
        );
        let inviteButton = gameManager.gameDom.getElement('.'+type+'-invite-' + target.id + ' button');
        inviteButton?.addEventListener('click', () => {
            let sendData = {act: TeamsConst.ACTIONS[type.toUpperCase()+'_INVITE'], id: target.id};
            gameManager.room.send('*', sendData);
            inviteButton.style.display = 'none';
            gameManager.gameEngine.clearTarget();
        });
    }

    static targetIsValidPlayer(target, currentPlayer)
    {
        return GameConst.TYPE_PLAYER === target.type && currentPlayer.playerId !== target.id;
    }
}

module.exports.TeamTargetBoxEnricher = TeamTargetBoxEnricher;
