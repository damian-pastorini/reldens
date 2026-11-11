/**
 *
 * Reldens - Test Death Revive Choices
 *
 * Tests the restoration item choice of the dead player ("drc", sent by the game over box buttons or as a raw room
 * message, RoomMessagesRecorder): a choice that is not a boolean, a second choice in the same death (use after keep), a
 * choice with the death teleport disabled, a choice with the restoration item consumed automatically and a choice from
 * a player carrying no item are ignored (no revive message answers them and the revive follows the previous mode); and
 * a double click on the use or keep button makes one choice: one revive message, one item consumed or the item kept.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathReviveChoices
{

    static QUIET_MS = 1500;
    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};

    static async sendChoiceIgnored(context, use, label)
    {
        expect(await RoomMessagesRecorder.sendAndFetchAnswers(
            context.page,
            [{act: ActionsConst.DEATH.ACTIONS.RESTORATION_ITEM_CHOICE, use}],
            [ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE],
            TestDeathReviveChoices.QUIET_MS
        ), label+': no revive message answers it').toEqual([]);
    }

    static async doubleClickChoice(context, buttonSelector)
    {
        await RoomMessagesRecorder.start(context.page);
        await context.page.locator(buttonSelector).dblclick();
    }

    static async expectOneChoiceAnswer(context)
    {
        await context.page.waitForTimeout(TestDeathReviveChoices.QUIET_MS);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.page, ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE),
            'One choice is answered'
        ).toHaveLength(1);
    }

    static async runNonBooleanChoiceTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(context, {});
        await TestDeathReviveChoices.sendChoiceIgnored(context, String(true), 'Choice that is not a boolean');
        await expect(context.page.locator(Selectors.gameOver.restorationItemUseButton)).toBeVisible();
        await DeathReviveSteps.expectRevivedInTown(
            context,
            (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name
        );
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runSecondChoiceTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(context, {});
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemKeepButton);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathReviveChoices.sendChoiceIgnored(context, true, 'Use after keep in the same death');
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runTeleportOffChoiceTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(
            context,
            Object.assign({}, TestDeathReviveChoices.TELEPORT_OFF, DeathReviveSteps.ASKED_ITEM_CONFIG),
            1
        );
        await DeathReviveSteps.expectGameOverMessage(context, DeathReviveSteps.DEATH_SNIPPETS.reviveInPlace, 0);
        await TestDeathReviveChoices.sendChoiceIgnored(context, true, 'Choice with the teleport disabled');
        await DeathReviveSteps.expectAliveInForest(context);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runAutoConsumeChoiceTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(context, {}, 1);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await TestDeathReviveChoices.sendChoiceIgnored(context, false, 'Keep with the item consumed automatically');
        await DeathReviveSteps.expectItemConsumedInForest(context, restorationItemKey);
    }

    static async runNoItemChoiceTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, DeathReviveSteps.ASKED_ITEM_CONFIG, 0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathReviveChoices.sendChoiceIgnored(context, true, 'Choice of a player carrying no item');
        await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
    }

    static async runDoubleClickUseTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(
            context,
            DeathReviveSteps.ASKED_ITEM_CONFIG,
            2
        );
        await DeathReviveSteps.expectRestorationItemQuestion(context, restorationItemKey);
        await TestDeathReviveChoices.doubleClickChoice(context, Selectors.gameOver.restorationItemUseButton);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await TestDeathReviveChoices.expectOneChoiceAnswer(context);
        await DeathReviveSteps.expectAliveInForest(context);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runDoubleClickKeepTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(context, {});
        await TestDeathReviveChoices.doubleClickChoice(context, Selectors.gameOver.restorationItemKeepButton);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathReviveChoices.expectOneChoiceAnswer(context);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static run()
    {
        test.describe('Death Revive Choices', () => {
            test('item choice that is not a boolean is ignored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveChoices.runNonBooleanChoiceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second item choice in the same death is ignored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveChoices.runSecondChoiceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item choice with the death teleport disabled is ignored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveChoices.runTeleportOffChoiceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item choice with the item consumed automatically is ignored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveChoices.runAutoConsumeChoiceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item choice of a player carrying no item is ignored and the town message stays', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveChoices.runNoItemChoiceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('double click on the use button makes one choice and consumes one item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveChoices.runDoubleClickUseTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('double click on the keep button makes one choice and keeps the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveChoices.runDoubleClickKeepTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathReviveChoices.run();
