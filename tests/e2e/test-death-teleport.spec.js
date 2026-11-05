/**
 *
 * Reldens - Test Death Teleport
 *
 * Tests the death teleport to town: with the teleport enabled for the group, the player killed in the forest by a real
 * enemy hit revives in the configured town room; with the restoration item it revives in the forest and the item is
 * consumed; and the resurrection ad, offered by a button in the game over box and played by the client ads provider
 * through the e2e SDK mock (AdMessagesPlayer) only when that button is clicked, rewards the restoration item that revives
 * the player in the forest. The game over box shows the translated revive message of each case (the town room title or
 * the restoration item label, read from their stored rows), the ad button only when the ad is offered, and the item
 * message once the ad reward is given. The town room, the item and the ad come from the stored config rows. It also
 * tests the revive options set for the group: without the restoration item auto consume the game over box asks to use
 * the carried item, the yes button revives the player where it died consuming the item and the no button keeps the
 * item and revives it in the town room; without the auto revive the game over box tells the seconds left to the
 * revive, the player stays dead once that time passed and the revive button revives it where it died, with the death
 * teleport disabled or consuming the chosen restoration item. The death and revive steps are the DeathReviveSteps ones.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathTeleport
{

    static async runTownReviveTest(context)
    {
        await DeathReviveSteps.prepareDeath(context);
        await DeathReviveSteps.killPlayerInForest(context, await DeathReviveSteps.enterForest(context));
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
    }

    static async runRestorationItemTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerWithRestorationItem(context, {});
        await DeathReviveSteps.expectRevivedInForest(context, restorationItemKey);
    }

    static async runResurrectionAdTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.prepareDeath(context);
        let resurrectionAd = await AdMessagesPlayer.enableAd(
            context.gameConfig,
            context.e2eGroup,
            await E2eSeedAndRestoreApi.fetchConfigValue(
                context.gameConfig,
                ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY
            ),
            context.gameConfig.e2ePlayerName
        );
        let placement = await DeathReviveSteps.enterForest(context);
        let adTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, context.longRun);
        await AdMessagesPlayer.waitForProviderReady(context.page, adTimeout);
        await DeathReviveSteps.killPlayerInForest(context, placement);
        await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await expect(
            context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR),
            'The resurrection ad must not play before the player asks for it'
        ).toHaveCount(0);
        await expect(context.page.locator(Selectors.gameOver.resurrectionAdButton)).toHaveText(
            DeathReviveSteps.DEATH_SNIPPETS.resurrectionAdButton
        );
        await context.page.click(Selectors.gameOver.resurrectionAdButton);
        await AdMessagesPlayer.waitForPlayedAd(context.page, resurrectionAd, adTimeout);
        await DeathReviveSteps.expectRevivedInForest(context, restorationItemKey);
    }

    static async killPlayerAskedForTheItem(context, configValues)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerWithRestorationItem(
            context,
            Object.assign({}, DeathReviveSteps.ASKED_ITEM_CONFIG, configValues)
        );
        await DeathReviveSteps.expectRestorationItemQuestion(context, restorationItemKey);
        return restorationItemKey;
    }

    static async runUsedRestorationItemTest(context)
    {
        let restorationItemKey = await TestDeathTeleport.killPlayerAskedForTheItem(context, {});
        await context.page.click(Selectors.gameOver.restorationItemUseButton);
        await DeathReviveSteps.expectRevivedInForest(context, restorationItemKey);
    }

    static async runKeptRestorationItemTest(context)
    {
        let restorationItemKey = await TestDeathTeleport.killPlayerAskedForTheItem(context, {});
        await context.page.click(Selectors.gameOver.restorationItemKeepButton);
        await expect(
            context.page.locator(Selectors.gameOver.restorationItemKeepButton),
            'The restoration item is not asked once it is kept'
        ).toHaveCount(0);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runManualReviveInPlaceTest(context)
    {
        await DeathReviveSteps.prepareDeath(context, Object.assign(
            {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        ));
        await DeathReviveSteps.killPlayerInForest(context, await DeathReviveSteps.enterForest(context));
        await DeathReviveSteps.expectReviveWait(context);
        await DeathReviveSteps.expectGameOverMessage(context, DeathReviveSteps.DEATH_SNIPPETS.reviveInPlace, 0);
        await DeathReviveSteps.requestReviveInForest(context);
        expect(
            await TestCombatDeath.waitForPlayerHpCondition(context.page, 'alive', TimeConstants.PLAYER_REVIVE),
            'The player must revive once it asks for it'
        ).toBe(true);
        expect(await Navigation.getCurrentRoomName(context.page), 'The player must revive where it died').toBe(
            Login.FOREST_ROOM_NAME
        );
        await context.screenshots.capture(context.page, 'player-revived-in-forest');
    }

    static async runManualReviveWithRestorationItemTest(context)
    {
        let restorationItemKey = await TestDeathTeleport.killPlayerAskedForTheItem(
            context,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        );
        await DeathReviveSteps.expectReviveWait(context);
        await context.page.click(Selectors.gameOver.restorationItemUseButton);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectItemConsumedInForest(context, restorationItemKey);
    }

    static run()
    {
        test.describe('Death Teleport', () => {
            test('dead player revives in the town room with the death teleport enabled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runTownReviveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player with the restoration item revives where it died and consumes the item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runRestorationItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('resurrection ad rewards the restoration item that revives the dead player where it died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runResurrectionAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player chooses to use the restoration item and revives where it died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runUsedRestorationItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player chooses to keep the restoration item and revives in the town room', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runKeptRestorationItemTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player without auto revive asks for the revive where it died once the wait passed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runManualReviveInPlaceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player without auto revive uses the restoration item and asks for the revive', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTeleport.runManualReviveWithRestorationItemTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathTeleport.run();
