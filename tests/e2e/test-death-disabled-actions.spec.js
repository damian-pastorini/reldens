/**
 *
 * Reldens - Test Death Disabled Actions
 *
 * Tests a dead player in a room with every action disabled (the forest room custom data allActionsDisabled is set for
 * the group after DeathReviveSteps killed the player there with a real enemy hit): the restoration item choice and the
 * revive request are still accepted, so the item chosen with the use button is consumed by the revive in the forest;
 * and with a resurrection ad requested from the game over box the room refuses the ad start (its ads messages never
 * run), so the player revives in the town room on the game over time, long before the ads maximum duration (set to 60
 * seconds for the group).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { DeathResurrectionAdSteps } = require('./helpers/death-resurrection-ad-steps');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
const { AdsConst } = require('../../lib/ads/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathDisabledActions
{

    static ADS_MAXIMUM_DURATION_MS = 60000;

    static async disableAllActions(context)
    {
        await GameplayE2eStateApi.changeRoomCustomData(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            {allActionsDisabled: true}
        );
    }

    static async runItemChoiceAndReviveTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerAskedForTheItem(
            context,
            DeathReviveSteps.MANUAL_REVIVE_CONFIG
        );
        await TestDeathDisabledActions.disableAllActions(context);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.restorationItemUseButton);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await DeathReviveSteps.requestReviveInForest(context);
        await DeathReviveSteps.expectItemConsumedInForest(context, restorationItemKey);
    }

    static async runRequestedAdTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(
            context,
            {[AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION]: TestDeathDisabledActions.ADS_MAXIMUM_DURATION_MS},
            0
        );
        await TestDeathDisabledActions.disableAllActions(context);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        let clickedAt = Date.now();
        await expect(context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR), 'The ad plays').toBeVisible(
            {timeout: adDeath.adTimeout}
        );
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        expect(
            Date.now() - clickedAt,
            'The revive in town does not wait for the ad the room never processes'
        ).toBeLessThan(TestDeathDisabledActions.ADS_MAXIMUM_DURATION_MS);
    }

    static run()
    {
        test.describe('Death Disabled Actions', () => {
            test('dead player in a room with every action disabled still chooses the item and asks for the revive', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDisabledActions.runItemChoiceAndReviveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('resurrection ad requested in a room with every action disabled revives in town on the game over time', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathDisabledActions.runRequestedAdTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathDisabledActions.run();
