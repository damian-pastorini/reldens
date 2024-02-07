/**
 *
 * Reldens - TradeTargetAction
 *
 */

const { InventoryConst } = require('../../constants');
const { GameConst } = require('../../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class TradeTargetAction
{

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
    }

}

module.exports.TradeTargetAction = TradeTargetAction;