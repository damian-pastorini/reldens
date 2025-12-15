/**
 *
 * Reldens - TargetBoxEnricher
 *
 * Enriches the target box with team and clan invite buttons when appropriate.
 *
 */

const { TeamsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class TargetBoxEnricher
{

    /**
     * @param {GameManager} gameManager
     * @param {Object} target
     * @param {Object} previousTarget
     * @param {string} targetName
     * @returns {boolean}
     */
    static appendClanInviteButton(gameManager, target, previousTarget, targetName)
    {
        let currentClan = gameManager?.gameEngine?.uiScene?.currentClan;
        if(!currentClan){
            // the current player has none clan:
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
        let currentPlayer = gameManager.getCurrentPlayer();
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

    /**
     * @param {GameManager} gameManager
     * @param {Object} target
     * @param {Object} previousTarget
     * @param {string} targetName
     * @returns {boolean}
     */
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

    /**
     * @param {string} type
     * @param {Object} target
     * @param {GameManager} gameManager
     * @param {string} targetName
     * @returns {boolean}
     */
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

    /**
     * @param {Object} target
     * @param {Object} currentPlayer
     * @returns {boolean}
     */
    static targetIsValidPlayer(target, currentPlayer)
    {
        return GameConst.TYPE_PLAYER === target.type && currentPlayer.playerId !== target.id;
    }

    /**
     * @param {Object} currentClan
     * @param {string} targetId
     * @returns {Object|boolean}
     */
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
