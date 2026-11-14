/**
 *
 * Reldens - Test Trading Boxes
 *
 * Tests the trade boxes of the group players (TradeSteps: the trade messages sent as a client sends them and the trade
 * box elements of each client): each box is titled with the other player; the own player target and an NPC target (the
 * target an object click shows) show no start trade button while the other player target shows it; the confirm button is disabled with nothing offered, enabled with an
 * offer and disabled again after the confirm, the other player sees the confirmed label and a disconfirm enables the
 * confirm again and clears that label; an offered part of a stack shows its quantity on the sending and the receiving
 * columns, stays listed and a new offer of the same item replaces the quantity on both, while a whole stack offered is
 * hidden from the own items; a new trade between the same players after a cancel opens with no previous offer; offers
 * sent by both players at the same time show both offers on both boxes; and the trade
 * titles configured for the group are used by the request box and the trade box.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TradeSteps } = require('./helpers/trade-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { InventoryConst } = require('../../lib/inventory/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTradingBoxes
{

    static TITLES_PATH = 'client/trade/titles/';
    static LABELS = {
        tradeRequestFromLabel: 'E2E request from',
        confirmLabel: 'E2E confirm',
        disconfirmLabel: 'E2E disconfirm',
        cancelLabel: 'E2E cancel',
        myItems: 'E2E mine',
        pushedToTradeTitle: 'E2E sending',
        gotFromTradeTitle: 'E2E receiving'
    };

    static async enter(context, configValues = {})
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        return await TradeSteps.enterPlayers(context, 2, [], configValues);
    }

    static tradeBox(owner, partner)
    {
        return owner.page.locator('#box-trade'+partner.sessionId);
    }

    static async runTitlesTest(context)
    {
        let [starter, partner] = await TestTradingBoxes.enter(context);
        await TradeSteps.open(starter, partner);
        await expect(TestTradingBoxes.tradeBox(starter, partner), 'The starter box names the partner').toContainText(partner.playerName);
        await expect(TestTradingBoxes.tradeBox(partner, starter), 'The partner box names the starter').toContainText(starter.playerName);
    }

    static async runTargetButtonTest(context)
    {
        let [player, other] = await TestTradingBoxes.enter(context);
        for(let target of [player, other]){
            await player.page.evaluate(
                (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
                target.sessionId
            );
        }
        await expect(player.page.locator('.start-trade-'+other.sessionId+' button'), 'The other player can be traded').toBeVisible();
        await expect(player.page.locator('.start-trade-'+player.sessionId), 'No trade with the own player').toHaveCount(0);
        let objectTargetName = await player.page.evaluate((objectType) => {
            let scene = window.reldens.getActiveScene();
            let animationKey = Object.keys(scene.objectsAnimations).find(key => scene.objectsAnimations[key].targetName);
            let objectAnimation = scene.objectsAnimations[animationKey];
            let objectTarget = {id: objectAnimation.key, type: objectType};
            scene.player.currentTarget = objectTarget;
            window.reldens.gameEngine.showTarget(objectAnimation.targetName, objectTarget, {});
            return objectAnimation.targetName;
        }, ObjectsConst.TYPE_OBJECT);
        await expect(player.page.locator('#target-container'), 'The NPC is targeted').toContainText(objectTargetName);
        await expect(player.page.locator('#target-container [class*="start-trade-"]'), 'No trade with an NPC').toHaveCount(0);
    }

    static async runConfirmButtonsTest(context)
    {
        let [starter, partner] = await TestTradingBoxes.enter(context);
        await TradeSteps.open(starter, partner);
        let confirmButton = starter.page.locator('.confirm-'+partner.sessionId);
        await expect(confirmButton, 'The confirm is disabled with nothing offered').toBeDisabled();
        let potionId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(starter, partner, potionId, 1);
        await expect(confirmButton, 'The confirm is enabled with an offer').toBeEnabled({timeout: TimeConstants.SERVER_RESPONSE});
        await confirmButton.click();
        await expect(confirmButton, 'The confirm is disabled after confirming').toBeDisabled({timeout: TimeConstants.SERVER_RESPONSE});
        let partnerLabel = TestTradingBoxes.tradeBox(partner, starter).locator('.player-confirmed');
        await expect(partnerLabel, 'The partner sees the confirmed label').toHaveText(starter.playerName+' CONFIRMED');
        await starter.page.locator('.disconfirm-'+partner.sessionId).click();
        await expect(confirmButton, 'The disconfirm enables the confirm again').toBeEnabled({timeout: TimeConstants.SERVER_RESPONSE});
        await expect(partnerLabel, 'The partner label is cleared').toHaveText('');
    }

    static async expectOfferQuantity(starter, partner, itemId, quantity, message)
    {
        let sending = TestTradingBoxes.tradeBox(starter, partner).locator('.trade-col-2 .item-qty-'+itemId);
        await expect(sending, message+' on the sending column').toHaveText(String(quantity), {timeout: TimeConstants.SERVER_RESPONSE});
        let receiving = TestTradingBoxes.tradeBox(partner, starter).locator('.trade-col-3 .item-qty-'+itemId);
        await expect(receiving, message+' on the receiving column').toHaveText(String(quantity), {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runOfferDisplayTest(context)
    {
        let [starter, partner] = await TestTradingBoxes.enter(context);
        await TradeSteps.open(starter, partner);
        let potionId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(starter, partner, potionId, 2);
        await TestTradingBoxes.expectOfferQuantity(starter, partner, potionId, 2, 'The offered quantity');
        let ownItems = TestTradingBoxes.tradeBox(starter, partner).locator('.trade-col-1');
        await expect(ownItems.locator('.trade-item-'+potionId), 'A partial stack stays listed').not.toHaveClass(/hidden/);
        await TradeSteps.offer(starter, partner, potionId, 3);
        await TestTradingBoxes.expectOfferQuantity(starter, partner, potionId, 3, 'The new quantity replaces the old one');
        let axeId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eEquipableItemId);
        await TradeSteps.offer(starter, partner, axeId, 1);
        await expect(ownItems.locator('.trade-item-'+axeId), 'A whole stack is hidden from the own items').toHaveClass(/hidden/, {
            timeout: TimeConstants.SERVER_RESPONSE
        });
    }

    static async runNewTradeAfterCancelTest(context)
    {
        let [starter, partner] = await TestTradingBoxes.enter(context);
        await TradeSteps.open(starter, partner);
        let potionId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eConsumableItemId);
        await TradeSteps.offer(starter, partner, potionId, 2);
        await TestTradingBoxes.expectOfferQuantity(starter, partner, potionId, 2, 'The first trade offer');
        await TradeSteps.close(starter, partner);
        await TradeSteps.expectTradeOpen(context, starter, false, 'The first trade is cancelled');
        await TradeSteps.open(starter, partner);
        await TradeSteps.expectOffered(context, starter, {}, 'The new trade starts with no offer');
        let starterBox = TestTradingBoxes.tradeBox(starter, partner);
        await expect(starterBox.locator('.trade-col-2 .item-qty-'+potionId), 'No old offer on the sending column').toHaveCount(0);
        await expect(TestTradingBoxes.tradeBox(partner, starter).locator('.trade-col-3 .item-qty-'+potionId), 'Nor received')
            .toHaveCount(0);
        await expect(starter.page.locator('.confirm-'+partner.sessionId), 'The confirm starts disabled').toBeDisabled();
        await expect(starterBox.locator('.trade-col-1 .trade-item-'+potionId), 'The item is listed again').not.toHaveClass(/hidden/);
    }

    static async runBothOffersTest(context)
    {
        let [starter, partner] = await TestTradingBoxes.enter(context);
        await TradeSteps.open(starter, partner);
        let potionId = await TradeSteps.fetchItemId(context, starter, context.gameConfig.e2eConsumableItemId);
        let axeId = await TradeSteps.fetchItemId(context, partner, context.gameConfig.e2eEquipableItemId);
        await Promise.all([TradeSteps.offer(starter, partner, potionId, 1), TradeSteps.offer(partner, starter, axeId, 1)]);
        await TestTradingBoxes.expectOfferQuantity(starter, partner, potionId, 1, 'The starter offer');
        await TestTradingBoxes.expectOfferQuantity(partner, starter, axeId, 1, 'The partner offer');
    }

    static async runLabelsTest(context)
    {
        let configValues = {};
        for(let labelKey of Object.keys(TestTradingBoxes.LABELS)){
            configValues[TestTradingBoxes.TITLES_PATH+labelKey] = TestTradingBoxes.LABELS[labelKey];
        }
        let [starter, partner] = await TestTradingBoxes.enter(context, configValues);
        await TradeSteps.start(starter, partner);
        await TradeSteps.waitForMessages(partner, InventoryConst.ACTIONS.TRADE_START, 1);
        await expect(TestTradingBoxes.tradeBox(partner, starter), 'The request title')
            .toContainText(TestTradingBoxes.LABELS.tradeRequestFromLabel);
        await TradeSteps.answer(partner, starter);
        await TradeSteps.waitForMessages(starter, InventoryConst.ACTIONS.TRADE_SHOW, 1);
        let box = TestTradingBoxes.tradeBox(starter, partner);
        for(let labelKey of Object.keys(TestTradingBoxes.LABELS).slice(1)){
            await expect(box, 'The '+labelKey+' label').toContainText(TestTradingBoxes.LABELS[labelKey]);
        }
    }

    static run()
    {
        test.describe('Trading Boxes', () => {
            test('each trade box is titled with the other player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingBoxes.runTitlesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('own player and NPC targets show no start trade button', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingBoxes.runTargetButtonTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('confirm buttons follow the offers and the confirmations', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingBoxes.runConfirmButtonsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('offered quantities show on both boxes and whole stacks are hidden', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingBoxes.runOfferDisplayTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('new trade after a cancel opens with no previous offer', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingBoxes.runNewTradeAfterCancelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('offers sent at the same time show on both boxes', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingBoxes.runBothOffersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('configured trade titles are used', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTradingBoxes.runLabelsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTradingBoxes.run();
