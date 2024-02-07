/**
 *
 * Reldens - TargetBoxEnricher
 *
 */

const { TeamsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class TargetBoxEnricher
{

    static appendClanInviteButton(gameManager, target, previousTarget, targetName)
    {
        let currentClan = gameManager?.gameEngine?.uiScene?.currentClan;
        if(!currentClan){
            // current player has none clan:
            return false;
        }
        if(!currentClan.ownerId){
            Logger.error('Current clan missing owner.', currentClan);
            return false;
        }
        if(this.playerBySessionId(currentClan, target.id)){
            // target player is already on the clan:
            return false;
        }
        let currentPlayer = gameManager.getCurrentPlayer(); // @TODO - Reviewed: OK
        if(!this.targetIsValidPlayer(target, currentPlayer)){
            // target is not the current player
            return false;
        }
        let isOpenInvites = gameManager.config.getWithoutLogs('client/clan/general/openInvites', false);
        if(gameManager.playerData.id.toString() !== currentClan.ownerId.toString() && !isOpenInvites){
            // only clan owner can invite:
            return false;
        }
        return this.appendInviteButton('clan', target, gameManager, targetName);
    }

    static appendTeamInviteButton(gameManager, target, previousTarget, targetName)
    {
        if(!this.targetIsValidPlayer(target, gameManager.getCurrentPlayer())){ // @TODO - Reviewed: OK
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
                    playerId: target.player_id,
                    inviteLabel: gameManager.config.getWithoutLogs(
                        type+'/labels/inviteLabel',
                        TeamsConst.LABELS[type.toUpperCase()].INVITE_BUTTON_LABEL
                    )
                }
            )
        );
        let inviteButton = gameManager.gameDom.getElement('.'+type+'-invite-' + target.player_id + ' button');
        inviteButton?.addEventListener('click', () => {
            let sendInvite = {act: TeamsConst.ACTIONS[type.toUpperCase()+'_INVITE'], id: target.player_id};
            gameManager.activeRoomEvents.send(sendInvite);
            inviteButton.style.display = 'none';
            gameManager.gameEngine.clearTarget();
        });
    }

    static targetIsValidPlayer(target, currentPlayer)
    {
        return GameConst.TYPE_PLAYER === target.type && currentPlayer.playerId !== target.id;
    }

    static playerBySessionId(currentClan, targetId)
    {
        let playersKeys = Object.keys(currentClan.players);
        if(0 === playersKeys.length){
            return false;
        }
        for(let i of playersKeys){
            if(currentClan.players[i].sessionId === targetId){
                return currentClan.players[i];
            }
        }
        return false;
    }

}

module.exports.TargetBoxEnricher = TargetBoxEnricher;
