/**
 *
 * Reldens - Trader Steps
 *
 * The steps of the trader specs over the configured town trader (e2eTraderKey): the player placed next to the trader
 * (NpcDialogSteps), its dialog opened and the buy or sell option button clicked to open the shop; the trader results
 * the client received (the UI messages of the trader listener, recorded by RoomMessagesRecorder); the shop item id of
 * an item key read from the last result; an item added to the cart with the quantity input and its shop button, the
 * cart confirmed with its button, each step waiting for its result; and a trader message sent as the client sends it.
 *
 */

const { expect } = require('@playwright/test');
const { NpcDialogSteps } = require('./npc-dialog-steps');
const { RoomMessagesRecorder } = require('./room-messages-recorder');
const { Phaser } = require('./phaser');
const { TimeConstants } = require('./time-constants');
const { GameConst } = require('../../../lib/game/constants');
const { ObjectsConst } = require('../../../lib/objects/constants');

class TraderSteps
{

    static LISTENER = 'traderObject';

    static async openShop(context, player, action)
    {
        let traderKey = context.gameConfig.e2eTraderKey;
        await NpcDialogSteps.placeNextToNpc(context, player.page, traderKey);
        expect(await Phaser.triggerObjectInteraction(player.page, traderKey), 'The trader interaction is sent').toBe(true);
        let optionButton = player.page.locator('[data-option-value="'+action+'"]').filter({visible: true});
        await expect(optionButton, 'The trader shows its '+action+' option').toBeVisible({timeout: TimeConstants.UI_OPEN});
        await optionButton.click();
        let shop = {page: player.page, traderKey, action, container: player.page.locator('.trade-container-'+action)};
        await expect(shop.container, 'The '+action+' shop opens').toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
        return shop;
    }

    static fetchResults = async (page) => (await RoomMessagesRecorder.fetchMessages(page, GameConst.UI)).filter(
        message => TraderSteps.LISTENER === message.listener
    ).map(message => message.result);

    static async findShopItemId(shop, itemKey)
    {
        let items = [...await TraderSteps.fetchResults(shop.page)].pop().items;
        let itemId = Object.keys(items).find(inventoryId => itemKey === items[inventoryId].key);
        expect(itemId, 'The '+itemKey+' is listed in the '+shop.action+' shop').toBeTruthy();
        return itemId;
    }

    static async waitForResult(shop, previousCount)
    {
        await expect.poll(
            async () => (await TraderSteps.fetchResults(shop.page)).length,
            {message: 'The trader answers the '+shop.action+' action', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(previousCount);
        return [...await TraderSteps.fetchResults(shop.page)].pop();
    }

    static async addToCart(shop, itemKey, qty = 1)
    {
        let itemId = await TraderSteps.findShopItemId(shop, itemKey);
        let itemBox = shop.container.locator('.trade-col-1 .trade-item-'+itemId);
        await itemBox.locator('.item-qty input').fill(String(qty));
        let previousCount = (await TraderSteps.fetchResults(shop.page)).length;
        await itemBox.locator('.trade-action-'+shop.action+' button').click();
        return Object.assign(await TraderSteps.waitForResult(shop, previousCount), {itemId});
    }

    static async confirm(shop)
    {
        let previousCount = (await TraderSteps.fetchResults(shop.page)).length;
        await shop.page.locator('.confirm-'+shop.action).click();
        return await TraderSteps.waitForResult(shop, previousCount);
    }

    static async sendShopMessage(shop, message)
    {
        return await RoomMessagesRecorder.sendObjectMessage(
            shop.page,
            shop.traderKey,
            Object.assign({act: ObjectsConst.OBJECT_INTERACTION, value: shop.action}, message)
        );
    }

}

module.exports.TraderSteps = TraderSteps;
