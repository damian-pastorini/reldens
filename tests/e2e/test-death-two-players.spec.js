/**
 *
 * Reldens - Test Death Two Players
 *
 * Tests two players dead in the forest at the same time with the death teleport on (DeathReviveSteps kills the first
 * player with a real enemy hit, the second player is killed by the other enemy of the same respawn layer while the
 * first one is still dead, TestCombatDeath): each death is resolved on its own, both players get the town message and
 * revive in the town room; and with the resurrection ad offered to both, the first player that watches the ad gets the
 * reward and revives where it died, while the second player keeps its own ad button, receives no item and revives in
 * the town room.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { DeathResurrectionAdSteps } = require('./helpers/death-resurrection-ad-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathTwoPlayers
{

    static async killSecondPlayer(context, secondContext)
    {
        await TestCombatDeath.killPlayerAgain(secondContext.page, secondContext.gameConfig, TimeConstants.ENEMY_KILL);
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).life,
            'The first player is still dead when the second one dies'
        ).toBe(0);
    }

    static async runBothRevivedInTownTest(context)
    {
        await DeathReviveSteps.prepareDeath(context, {});
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await DeathReviveSteps.killPlayerInForest(context, {}, 'The first player died');
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathTwoPlayers.killSecondPlayer(context, secondContext);
        await DeathReviveSteps.expectTownGameOverMessage(secondContext, 0);
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
        await DeathReviveSteps.expectRevivedInTown(secondContext, townRoomName);
    }

    static async runOneAdWatchedTest(context)
    {
        let resurrectionAd = await DeathResurrectionAdSteps.enableResurrectionAd(context);
        await AdMessagesPlayer.enableAd(
            context.gameConfig,
            context.e2eGroup,
            await E2eSeedAndRestoreApi.fetchConfigValue(
                context.gameConfig,
                ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY
            ),
            context.gameConfig.e2ePlayerName2
        );
        let restorationItemKey = await DeathReviveSteps.prepareDeath(context, {});
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        let adTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, context.longRun);
        await AdMessagesPlayer.waitForProviderReady(context.page, adTimeout);
        await DeathReviveSteps.killPlayerInForest(context, {}, 'The first player died');
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await TestDeathTwoPlayers.killSecondPlayer(context, secondContext);
        await DeathReviveSteps.expectTownGameOverMessage(secondContext, 1);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        await AdMessagesPlayer.waitForPlayedAd(context.page, resurrectionAd, adTimeout);
        await expect(
            secondContext.page.locator(Selectors.gameOver.resurrectionAdButton),
            'The second player keeps its own ad button'
        ).toHaveCount(1);
        await DeathReviveSteps.expectRestorationItemQuantity(secondContext, restorationItemKey, 0);
        await DeathReviveSteps.expectRevivedInForest(context, restorationItemKey);
        await DeathReviveSteps.expectRevivedInTown(secondContext, townRoomName);
    }

    static run()
    {
        test.describe('Death Two Players', () => {
            test('two players dead at once with the teleport on both revive in the town room', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTwoPlayers.runBothRevivedInTownTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('two dead players, the one that watches the ad is rewarded and the other keeps its ad button', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathTwoPlayers.runOneAdWatchedTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathTwoPlayers.run();
