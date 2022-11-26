/**
 *
 * Reldens - TradeTargetAction
 *
 */

const { InventoryConst } = require('../../constants');
const { GameConst } = require('../../../game/constants');
const { sc } = require('@reldens/utils');

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
        uiTarget.getChildByID('box-target').style.display = 'block';
        uiTarget.getChildByID('target-container').innerHTML += gameManager.gameEngine.parseTemplate(
            inventoryTradeStartTemplate,
            {
                playerName: targetName,
                playerId: target.id
            }
        );
        gameManager.gameDom.getElement('.start-trade-'+target.id+' button')?.addEventListener('click', () => {
            let sendData = {act: InventoryConst.ACTIONS.TRADE_START, id: target.id};
            gameManager.room.send('*', sendData);
        });
    }

}

module.exports.TradeTargetAction = TradeTargetAction;