/**
 *
 * Reldens - ItemDisplayEnricher
 *
 * Enriches item display with info toggles and trade action buttons.
 * Shared between player trade and NPC trader UI.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ItemDisplayEnricher
{

    /**
     * @param {import('../../game/client/game-dom').GameDom} gameDom
     * @param {import('phaser').Scene} uiScene
     * @param {import('../../game/client/game-manager').GameManager} gameManager
     */
    constructor(gameDom, uiScene, gameManager)
    {
        this.gameDom = gameDom;
        this.uiScene = uiScene;
        this.gameManager = gameManager;
    }

    closeAllItemInfoBoxes()
    {
        let allOpen = this.gameDom.getElements('.item-box.item-info-visible');
        for(let el of allOpen){
            el.classList.remove('item-info-visible');
        }
    }

    /**
     * @param {string} selector
     */
    activateItemInfoToggle(selector)
    {
        let imageContainer = this.gameDom.getElement(selector + ' .image-container');
        if(!imageContainer){
            return;
        }
        let itemBox = this.gameDom.getElement(selector);
        imageContainer.addEventListener('click', (event) => {
            event.stopPropagation();
            if(!itemBox){
                return;
            }
            let isOpen = itemBox.classList.contains('item-info-visible');
            this.closeAllItemInfoBoxes();
            if(!isOpen){
                itemBox.classList.add('item-info-visible');
            }
        });
    }

    /**
     * @param {Object} item
     * @param {string} [tradeAction]
     * @returns {string}
     */
    createTradeActionContent(item, tradeAction)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeAction');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeAction".');
            return '';
        }
        let resolvedAction = tradeAction || sc.get(item, 'tradeAction', '');
        let actionIcon = '/assets/icons/' + ('trade' === resolvedAction ? 'arrow-right.png' : 'cart.png');
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            id: item.getInventoryId(),
            tradeAction: resolvedAction,
            actionIcon
        });
    }

    /**
     * @param {Object} item
     * @returns {string}
     */
    createTradeActionRemove(item)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('inventoryTradeActionRemove');
        if(!messageTemplate){
            Logger.error('Missing template "inventoryTradeActionRemove".');
            return '';
        }
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            key: item.key,
            id: item.uid,
            tradeAction: 'remove'
        });
    }

}

module.exports.ItemDisplayEnricher = ItemDisplayEnricher;
