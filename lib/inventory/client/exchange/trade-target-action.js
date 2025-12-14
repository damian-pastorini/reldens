/**
 *
 * Reldens - TradeTargetAction
 *
 * Manages trade action UI for targeted players on the client side.
 * Displays trade start buttons when targeting other players.
 *
 */

const { InventoryConst } = require('../../constants');
const { GameConst } = require('../../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../game/client/game-manager').GameManager} GameManager
 */
class TradeTargetAction
{

    /**
     * @param {GameManager} gameManager
     * @param {Object} target
     * @param {Object} previousTarget
     * @param {string} targetName
     * @returns {boolean}
     */
    showTargetExchangeAction(gameManager, target, previousTarget, targetName)
    {
        if(GameConst.TYPE_PLAYER !== target.type || gameManager.getCurrentPlayer().playerId === target.id){
            return false;
        }
        let uiScene = gameManager.gameEngine.uiScene;
        let uiTarget = sc.get(uiScene, 'uiTarget', false);
        if(false === uiTarget){
            return false;
        }
        let inventoryTradeStartTemplate = uiScene.cache.html.get('inventoryTradeStart');
        if(!inventoryTradeStartTemplate){
            Logger.critical('Template "inventoryTradeStart" not found.');
            return false;
        }
        gameManager.gameDom.appendToElement(
            '#target-container',
            gameManager.gameEngine.parseTemplate(
                inventoryTradeStartTemplate,
                {
                    playerName: targetName,
                    playerId: target.id
                }
            )
        );
        let tradeStartButton = gameManager.gameDom.getElement('.start-trade-'+target.id+' button');
        if(!tradeStartButton){
            Logger.critical('Trade start button not found for selector: "'+'.start-trade-'+target.id+' button'+'"');
            return false;
        }
        tradeStartButton.addEventListener('click', () => {
            let sendData = {act: InventoryConst.ACTIONS.TRADE_START, id: target.id};
            gameManager.activeRoomEvents.send(sendData);
        });
        return true;
    }

}

module.exports.TradeTargetAction = TradeTargetAction;
