/**
 *
 * Reldens - Test Death Leave And Return
 *
 * Tests a dead player that leaves the game before its revive (DeathReviveSteps kills it in the forest with a real enemy
 * hit): its death is kept by player ID, so once the game over time passed offline its stored life is revived to its base
 * value where it died with the death teleport off and in the town with it on (ISSUE #47), and a carried restoration item
 * is not consumed; a player that logs in again after leaving dead (a 20 seconds game over time with the manual revive,
 * so the login always lands inside it) joins the forest dead with one game over box telling only the seconds left, with
 * the players last state handler of the forest off and on (on, the player is still dead once the handler time passed);
 * a reload during the manual revive wait joins dead with the wait box and then shows the revive button once the time
 * left passed; a reload while the resurrection ad plays (with the 20 seconds game over time) gives no item, leaves its
 * played row open and the restored death offers the ad again, which revives the player in the forest; and the dead
 * player logged in from a second
 * browser ends the first session, whose tab shows the session ended modal, and the death restored in the new session
 * revives it once after the time left (the revived player logged in again from a second browser gets the same modal on
 * the first tab).
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
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Navigation } = require('./helpers/navigation');
const { LoginServerApi } = require('./helpers/login-server-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
const GameTranslations = require('../../lib/game/client/snippets/en_US');
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
    static REJOIN_GAME_OVER_TIME_OUT = 20000;
    static REJOIN_DEATH = Object.assign(
        {[ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: TestDeathLeaveAndReturn.REJOIN_GAME_OVER_TIME_OUT},
        TestDeathLeaveAndReturn.MANUAL_IN_PLACE
    );

    static async expectRevivedOffline(context, roomName)
    {
        let {page, gameConfig} = context;
        let baseLife = await page.evaluate(
            (statKey) => Number(window.reldens.playerData.statsBase[statKey]),
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ForestEnemyKill.AFFECTED_PROPERTY_PATH)
        );
        await page.goto('about:blank');
        await expect.poll(
            async () => await ForestEnemyKill.fetchStoredLife(gameConfig, gameConfig.e2ePlayerName),
            {
                message: 'The stored life is revived to its base value once the game over time passed offline',
                timeout: context.gameOverTimeOut + TestDeathLeaveAndReturn.QUIET_MS + TimeConstants.SERVER_RESPONSE
            }
        ).toBe(baseLife);
        expect(
            Number((await E2eSeedAndRestoreApi.fetchPlayerState(gameConfig, gameConfig.e2ePlayerName)).room_id),
            'The offline revive stores the player in '+roomName
        ).toBe(await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName}));
    }

    static async killAndRejoinDead(context, leaveAction)
    {
        let rejoinTimeOut = TestDeathLeaveAndReturn.REJOIN_GAME_OVER_TIME_OUT;
        let secondMs = ActionsConst.DEATH.DEFAULTS.SECOND_MS;
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.REJOIN_DEATH, 0);
        let killedAt = Date.now();
        test.setTimeout(test.info().timeout + rejoinTimeOut);
        context.gameOverTimeOut = rejoinTimeOut;
        await leaveAction();
        await context.page.waitForTimeout(Math.max(0, killedAt + secondMs - Date.now()));
        let loginStartedAt = Date.now();
        let rejoinedPlayer = await TestDeathLeaveAndReturn.loginAgainInForest(context, context.page);
        expect(rejoinedPlayer.inState, 'The player that left dead joins dead').toBe(GameConst.STATUS.DEATH);
        let waitPattern = new RegExp(DeathReviveSteps.DEATH_SNIPPETS.reviveWait.split('%seconds').map(
            textPart => textPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).join('(\\d+)'));
        let waitLocator = context.page.locator(Selectors.gameOver.wait);
        await expect(waitLocator, 'The game over box tells the seconds left').toHaveText(waitPattern, {
            timeout: TimeConstants.SERVER_RESPONSE
        });
        let secondsLeft = Number(waitPattern.exec(await waitLocator.textContent())[1]);
        expect(
            [0 < secondsLeft, secondsLeft <= Math.ceil((killedAt + rejoinTimeOut - loginStartedAt) / secondMs)],
            'The joined death waits only the game over time left after the kill: '+secondsLeft+' seconds'
        ).toEqual([true, true]);
        await expect(context.page.locator(Selectors.gameOver.box), 'One game over box is shown').toHaveCount(1);
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

    static recordClosedRoomSends(page)
    {
        let closedRoomSends = [];
        page.on('console', async (consoleMessage) => {
            if(-1 === consoleMessage.text().indexOf('Connection lost.')){
                return;
            }
            try {
                let consoleValues = [];
                for(let consoleArgument of consoleMessage.args()){
                    consoleValues.push(await consoleArgument.jsonValue());
                }
                closedRoomSends.push(consoleValues);
            } catch (error) {
                closedRoomSends.push(consoleMessage.text()+' ('+error.message+')');
            }
        });
        return closedRoomSends;
    }

    static async expectFirstSessionRemoved(context, closedRoomSends)
    {
        await expect.poll(
            async () => await LoginServerApi.fetchPlayersInRoom(
                context.gameConfig,
                Login.FOREST_ROOM_NAME,
                context.gameConfig.e2ePlayerName
            ),
            {message: 'The first session is removed from the forest', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
        await expect.poll(
            async () => Object.assign(await context.page.evaluate((selectors) => ({
                message: String(document.querySelector(selectors.message)?.textContent || '').trim(),
                gameOver: Boolean(window.reldens?.gameOver),
                forcedDisconnection: Boolean(window.reldens?.forcedDisconnection),
                isChangingScene: Boolean(window.reldens?.isChangingScene),
                isGameOverBoxVisible: 0 < Number(document.querySelector(selectors.gameOverBox)?.offsetHeight || 0)
            }), {message: Selectors.reloadModal.message, gameOverBox: Selectors.gameOver.box}), {closedRoomSends}),
            {
                message: 'The first tab tells its session ended after the death and sends nothing on its closed room',
                timeout: TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun)
            }
        ).toMatchObject({message: GameTranslations.game.errors.sessionEnded, closedRoomSends: []});
    }

    static async runOfflineReviveInPlaceTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.TELEPORT_OFF, 0);
        await TestDeathLeaveAndReturn.expectRevivedOffline(context, Login.FOREST_ROOM_NAME);
    }

    static async runOfflineReviveInTownTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, {}, 0);
        await TestDeathLeaveAndReturn.expectRevivedOffline(
            context,
            (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name
        );
    }

    static async runItemKeptAfterLeavingTest(context)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(context, {}, 1);
        await TestDeathLeaveAndReturn.expectRevivedOffline(
            context,
            (await DeathReviveSteps.fetchReviveLabels(context.gameConfig)).townRoom.name
        );
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
    }

    static async runRejoinStateHandlerOffTest(context)
    {
        await TestDeathLeaveAndReturn.killAndRejoinDead(context, async () => await context.page.goto('about:blank'));
        await context.screenshots.capture(context.page, 'rejoined-after-leaving-dead-handler-off');
    }

    static async runRejoinStateHandlerOnTest(context)
    {
        await TestDeathLeaveAndReturn.killAndRejoinDead(context, async () => {
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
        });
        await context.page.waitForTimeout(TestDeathLeaveAndReturn.STATE_HANDLER_MS + TestDeathLeaveAndReturn.QUIET_MS);
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The player stays dead once the state handler time passed'
        ).toBe(GameConst.STATUS.DEATH);
    }

    static async runReloadDuringWaitTest(context)
    {
        await TestDeathLeaveAndReturn.killAndRejoinDead(context, async () => await context.page.reload());
        await expect(context.page.locator(Selectors.gameOver.reviveButton), 'The revive button once the time left passed')
            .toHaveCount(1, {timeout: context.gameOverTimeOut + TimeConstants.SERVER_RESPONSE});
        await expect(context.page.locator(Selectors.gameOver.box), 'The same single game over box').toHaveCount(1);
    }

    static async runReloadWhileAdPlaysTest(context)
    {
        let adDeath = await DeathResurrectionAdSteps.killWithResurrectionAd(context, {
            [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: TestDeathLeaveAndReturn.REJOIN_GAME_OVER_TIME_OUT
        }, 0);
        test.setTimeout(test.info().timeout + TestDeathLeaveAndReturn.REJOIN_GAME_OVER_TIME_OUT);
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
        await DeathResurrectionAdSteps.playAdAndExpectRevivedInForest(context, adDeath);
    }

    static async runSecondBrowserLoginTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.TELEPORT_OFF, 0);
        let closedRoomSends = TestDeathLeaveAndReturn.recordClosedRoomSends(context.page);
        await TestDeathLeaveAndReturn.loginAgainInForest(context, context.secondPage);
        await TestDeathLeaveAndReturn.expectFirstSessionRemoved(context, closedRoomSends);
        await RoomMessagesRecorder.start(context.secondPage);
        await context.secondPage.waitForTimeout(context.gameOverTimeOut + TestDeathLeaveAndReturn.QUIET_MS);
        expect(
            {
                revivedMessages: (await RoomMessagesRecorder.fetchMessages(context.secondPage, GameConst.REVIVED)).length,
                hasLife: 0 < (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).life
            },
            'The death restored in the new session revives it once, the ended session timer never revives it again'
        ).toEqual({revivedMessages: 1, hasLife: true});
    }

    static async runRevivedSecondBrowserLoginTest(context)
    {
        await DeathReviveSteps.killPlayerCarryingItems(context, TestDeathLeaveAndReturn.TELEPORT_OFF, 0);
        await DeathReviveSteps.expectAliveInForest(context);
        let closedRoomSends = TestDeathLeaveAndReturn.recordClosedRoomSends(context.page);
        let rejoinedPlayer = await TestDeathLeaveAndReturn.loginAgainInForest(context, context.secondPage);
        expect(rejoinedPlayer.life, 'The second session gets the revived life').toBeGreaterThan(0);
        await TestDeathLeaveAndReturn.expectFirstSessionRemoved(context, closedRoomSends);
    }

    static run()
    {
        test.describe('Death Leave And Return', () => {
            test('revived player logged in from a second browser keeps its life and ends the first session', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runRevivedSecondBrowserLoginTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('dead player that leaves with the teleport off is revived offline where it died after the game over time', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runOfflineReviveInPlaceTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player that leaves with the teleport on is revived offline in the town after the game over time', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runOfflineReviveInTownTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player that leaves is revived offline in the town and keeps its auto consumed restoration item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runItemKeptAfterLeavingTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player that left dead logs in again to the forest dead with the game over time left and the state handler off', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runRejoinStateHandlerOffTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('player that left dead logs in again dead with the game over time left and the state handler on', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runRejoinStateHandlerOnTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('reload during the manual revive wait joins dead with the wait box and then the revive button', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runReloadDuringWaitTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reload while the resurrection ad plays gives no item and the restored death offers the ad again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runReloadWhileAdPlaysTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player logged in from a second browser ends the first session and its restored death revives it once', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathLeaveAndReturn.runSecondBrowserLoginTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestDeathLeaveAndReturn.run();
