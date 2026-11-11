/**
 *
 * Reldens - Test Death Leave And Return
 *
 * Tests a dead player that leaves the game before its revive (DeathReviveSteps kills it in the forest with a real enemy
 * hit): the death timers stop (no revive is stored after the game over time, the player is not relocated) and a carried
 * restoration item is not consumed; a player that logs in again after leaving dead joins the forest, with the players
 * last state handler of the forest off and on (on, the handler marks it dead at the login); a reload during the manual
 * revive wait leaves no revive button or stale game over box; a reload while the resurrection ad plays gives no item,
 * leaves its played row open and the next death starts the ad again; and the dead player logged in from a second
 * browser ends the first session, whose death timer does not revive the new session.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { DeathReviveShowcase } = require('./helpers/death-revive-showcase');
const { DeathResurrectionAdSteps } = require('./helpers/death-resurrection-ad-steps');
const { AdMessagesPlayer } = require('./helpers/ad-messages-player');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Navigation } = require('./helpers/navigation');
const { LoginServerApi } = require('./helpers/login-server-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathLeaveAndReturn
{

    static QUIET_MS = 1500;
    static STATE_HANDLER_MS = 2000;
    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};
    static MANUAL_IN_PLACE = Object.assign(
        {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
        {[ActionsConst.DEATH.CONFIG_PATHS.AUTO_REVIVE]: false}
    );

    static async expectNoResolutionAfterLeaving(context)
    {
        await context.page.goto('about:blank');
        await context.page.waitForTimeout(context.gameOverTimeOut + TestDeathLeaveAndReturn.QUIET_MS);
        expect(
            await ForestEnemyKill.fetchStoredLife(context.gameConfig, context.gameConfig.e2ePlayerName),
            'No revive is stored after the player left'
        ).toBe(0);
        let storedState = await E2eSeedAndRestoreApi.fetchPlayerState(
            context.gameConfig,
            context.gameConfig.e2ePlayerName
        );
        expect(Number(storedState.room_id), 'The player is not relocated').toBe(
            await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'rooms', {name: Login.FOREST_ROOM_NAME})
        );
    }

    static async loginAgainInForest(context, page)
    {
        await Login.loginRootPlayer(page, context.gameConfig, context.longRun);
        await Navigation.waitForRoom(page, Login.FOREST_ROOM_NAME, TimeConstants.forLongRun(
            TimeConstants.SCENE_LOAD,
            context.longRun
        ));
        return await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME);
    }

    static async expectFirstSessionRemoved(context)
    {
        await expect.poll(
            async () => await LoginServerApi.fetchPlayersInRoom(
                context.gameConfig,
                Login.FOREST_ROOM_NAME,
                context.gameConfig.e2ePlayerName
            ),
            {message: 'The first session is removed from the forest', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
    }

    static async runTimersStopTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.TELEPORT_OFF, 0);
        await TestDeathLeaveAndReturn.expectNoResolutionAfterLeaving(context);
    }

    static async runItemKeptAfterLeavingTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(context, {}, 1);
        await TestDeathLeaveAndReturn.expectNoResolutionAfterLeaving(context);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runRejoinStateHandlerOffTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.MANUAL_IN_PLACE, 0);
        await context.page.goto('about:blank');
        await TestDeathLeaveAndReturn.loginAgainInForest(context, context.page);
        await context.screenshots.capture(context.page, 'rejoined-after-leaving-dead-handler-off');
    }

    static async runRejoinStateHandlerOnTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.MANUAL_IN_PLACE, 0);
        await context.page.goto('about:blank');
        for(let roomProperty of [
            {key: 'applyPlayersLastStateHandler', value: true},
            {key: 'playersStateHandlerTimeOut', value: TestDeathLeaveAndReturn.STATE_HANDLER_MS}
        ]){
            let changed = await GameplayE2eStateApi.changeRoomProperty(
                context.gameConfig,
                context.e2eGroup,
                Login.FOREST_ROOM_NAME,
                roomProperty.key,
                roomProperty.value
            );
                expect(changed.propertyKey, 'The forest '+roomProperty.key+' must change: '+changed.error).toBe(
                roomProperty.key
            );
        }
        let rejoinedPlayer = await TestDeathLeaveAndReturn.loginAgainInForest(context, context.page);
        expect(rejoinedPlayer.inState, 'The state handler marks the player with no life').toBe(GameConst.STATUS.DEATH);
    }

    static async runReloadDuringWaitTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.MANUAL_IN_PLACE, 0);
        await context.page.reload();
        await TestDeathLeaveAndReturn.loginAgainInForest(context, context.page);
        await context.page.waitForTimeout(context.gameOverTimeOut + TestDeathLeaveAndReturn.QUIET_MS);
        await expect(context.page.locator(Selectors.gameOver.reviveButton), 'No revive button').toHaveCount(0);
        await expect(context.page.locator(Selectors.gameOver.box), 'No stale game over box').toBeHidden();
    }

    static async runReloadWhileAdPlaysTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {}, 0);
        test.setTimeout(test.info().timeout + TimeConstants.ENEMY_KILL);
        await DeathReviveSteps.expectTownGameOverMessage(context, 1);
        await DeathReviveShowcase.clickButton(context, Selectors.gameOver.resurrectionAdButton);
        await expect(context.page.locator(AdMessagesPlayer.AD_OVERLAY_SELECTOR), 'The ad plays').toBeVisible(
            {timeout: adDeath.adTimeout}
        );
        await context.page.reload();
        await context.page.waitForTimeout(adDeath.resurrectionAd.minimumDurationMs + AdMessagesPlayer.PLAY_MARGIN_MS);
        await DeathReviveSteps.expectRestorationItemQuantity(context, adDeath.restorationItemKey, 0);
        let playedAds = await DeathResurrectionAdSteps.fetchPlayedAds(context, adDeath.resurrectionAd.id);
        expect(playedAds.map(playedAd => Boolean(playedAd.ended_at)), 'The played ad row is left open').toEqual([false]);
        await TestDeathLeaveAndReturn.loginAgainInForest(context, context.page);
        await AdMessagesPlayer.waitForProviderReady(context.page, adDeath.adTimeout);
        await TestCombatDeath.killPlayerAgain(context.page, context.gameConfig, TimeConstants.ENEMY_KILL);
        await DeathResurrectionAdSteps.playAdAndExpectRevivedInForest(context, adDeath);
    }

    static async runSecondBrowserLoginTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.TELEPORT_OFF, 0);
        await TestDeathLeaveAndReturn.loginAgainInForest(context, context.secondPage);
        await TestDeathLeaveAndReturn.expectFirstSessionRemoved(context);
        await RoomMessagesRecorder.start(context.secondPage);
        await context.secondPage.waitForTimeout(context.gameOverTimeOut + TestDeathLeaveAndReturn.QUIET_MS);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.secondPage, GameConst.REVIVED),
            'The death timer of the ended session does not revive the new session'
        ).toEqual([]);
    }

    static async runRevivedSecondBrowserLoginTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.TELEPORT_OFF, 0);
        await DeathReviveSteps.expectAliveInForest(context);
        let rejoinedPlayer = await TestDeathLeaveAndReturn.loginAgainInForest(context, context.secondPage);
        expect(rejoinedPlayer.life, 'The second session gets the revived life').toBeGreaterThan(0);
        await TestDeathLeaveAndReturn.expectFirstSessionRemoved(context);
    }

    static run()
    {
        test.describe('Death Leave And Return', () => {
            test('revived player logged in from a second browser keeps its life and ends the first session', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runRevivedSecondBrowserLoginTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('dead player that leaves stops its death timers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runTimersStopTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player that leaves keeps its auto consumed restoration item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runItemKeptAfterLeavingTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player that left dead logs in again to the forest with the state handler off', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runRejoinStateHandlerOffTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('state handler marks the player that left dead as dead when it logs in again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runRejoinStateHandlerOnTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('reload during the manual revive wait leaves no revive button nor stale box', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runReloadDuringWaitTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reload while the resurrection ad plays gives no item and the next death starts the ad again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runReloadWhileAdPlaysTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player logged in from a second browser ends the first session', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runSecondBrowserLoginTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathLeaveAndReturn.run();
