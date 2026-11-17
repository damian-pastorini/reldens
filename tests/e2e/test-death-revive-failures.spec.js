/**
 *
 * Reldens - Test Death Revive Failures
 *
 * Tests the death resolution when a save fails (DeathReviveSteps kills the player in the forest with a real enemy hit,
 * then the next save of the forest room fails once the way it fails on a storage error, LiveObjectsOverrides): with the
 * death teleport and the auto revive on, a rejected stats save in the town revive keeps the player dead with no revive
 * button and the automatic retry revives it in the town room; with the teleport off, a rejected stats save in the in
 * place revive leaves the player activated on the server with no revive broadcast and the game over box open; with
 * two restoration items carried, a rejected stats save after the item was consumed consumes exactly one item, also
 * after the retry; and a failed relocation to the town room (the state save answering false, the town room not
 * available from the forest, or the body already changing scene) revives the player where it died.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { WorldE2eStateApi } = require('./helpers/world-e2e-state-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathReviveFailures
{

    static STATS_SAVE = 'savePlayerStats';
    static STATE_SAVE = 'savePlayerState';
    static QUIET_MS = 1500;
    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};

    static async killPlayer(context, configValues, restorationItemsCount)
    {
        let restorationItemKey = await DeathReviveSteps.killPlayerCarryingItems(
            context,
            configValues,
            restorationItemsCount
        );
        test.setTimeout(
            test.info().timeout + ActionsConst.DEATH.DEFAULTS.REVIVE_RETRY_MS + TestDeathReviveFailures.QUIET_MS
        );
        await RoomMessagesRecorder.start(context.page);
        return restorationItemKey;
    }

    static async failForestSave(context, methodKey, rejects)
    {
        let failure = await GameplayE2eStateApi.failRoomMethod(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            methodKey,
            1,
            rejects
        );
        expect(failure.methodKey, 'The '+methodKey+' failure must be set: '+failure.error).toBe(methodKey);
    }

    static async fetchFailuresDone(context, methodKey)
    {
        return (await GameplayE2eStateApi.fetchRoomMethodFailures(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            methodKey
        )).done;
    }

    static async waitForFailedSave(context, methodKey)
    {
        await expect.poll(
            async () => await TestDeathReviveFailures.fetchFailuresDone(context, methodKey),
            {message: 'The '+methodKey+' must fail once', timeout: context.gameOverTimeOut + TimeConstants.PLAYER_REVIVE}
        ).toBe(1);
    }

    static async expectRevivedWhereItDied(context)
    {
        expect((await DeathReviveSteps.expectAliveInForest(context)).inState).toBe(GameConst.STATUS.ACTIVE);
        await context.screenshots.capture(context.page, 'revived-where-it-died-after-failed-relocation');
    }

    static async runTownReviveRetryTest(context)
    {
        await TestDeathReviveFailures.killPlayer(context, {}, 0);
        await TestDeathReviveFailures.failForestSave(context, TestDeathReviveFailures.STATS_SAVE, true);
        let townRoomName = await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathReviveFailures.waitForFailedSave(context, TestDeathReviveFailures.STATS_SAVE);
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The player stays dead after the failed save'
        ).toBe(GameConst.STATUS.DEATH);
        await expect(context.page.locator(Selectors.gameOver.box)).toBeVisible();
        await expect(context.page.locator(Selectors.gameOver.reviveButton), 'No revive button').toHaveCount(0);
        await context.screenshots.capture(context.page, 'dead-after-failed-town-revive-save');
        await DeathReviveSteps.expectRevivedInTown(context, townRoomName);
    }

    static async runInPlaceReviveFailedSaveTest(context)
    {
        await TestDeathReviveFailures.killPlayer(context, TestDeathReviveFailures.TELEPORT_OFF, 0);
        await TestDeathReviveFailures.failForestSave(context, TestDeathReviveFailures.STATS_SAVE, true);
        await TestDeathReviveFailures.waitForFailedSave(context, TestDeathReviveFailures.STATS_SAVE);
        expect(
            (await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).inState,
            'The server already activated the player'
        ).toBe(GameConst.STATUS.ACTIVE);
        await context.page.waitForTimeout(ActionsConst.DEATH.DEFAULTS.REVIVE_RETRY_MS + TestDeathReviveFailures.QUIET_MS);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.page, GameConst.REVIVED),
            'No revive is broadcast'
        ).toEqual([]);
        await expect(context.page.locator(Selectors.gameOver.box), 'The game over box stays open').toBeVisible();
        expect(
            await TestDeathReviveFailures.fetchFailuresDone(context, TestDeathReviveFailures.STATS_SAVE),
            'The revive is not saved again'
        ).toBe(1);
        await context.screenshots.capture(context.page, 'game-over-box-open-after-failed-revive-save');
    }

    static async runConsumedItemRetryTest(context)
    {
        let restorationItemKey = await TestDeathReviveFailures.killPlayer(context, {}, 2);
        await TestDeathReviveFailures.failForestSave(context, TestDeathReviveFailures.STATS_SAVE, true);
        await DeathReviveSteps.expectItemReviveMessage(context, restorationItemKey);
        await TestDeathReviveFailures.waitForFailedSave(context, TestDeathReviveFailures.STATS_SAVE);
        await context.page.waitForTimeout(ActionsConst.DEATH.DEFAULTS.REVIVE_RETRY_MS + TestDeathReviveFailures.QUIET_MS);
        await DeathReviveSteps.expectRestorationItemQuantity(context, restorationItemKey, 1);
        expect(
            await TestDeathReviveFailures.fetchFailuresDone(context, TestDeathReviveFailures.STATS_SAVE),
            'The revive save failed once'
        ).toBe(1);
        await context.screenshots.capture(context.page, 'one-item-consumed-after-failed-revive-save');
    }

    static async runFailedRelocationSaveTest(context)
    {
        await TestDeathReviveFailures.killPlayer(context, {}, 0);
        await TestDeathReviveFailures.failForestSave(context, TestDeathReviveFailures.STATE_SAVE, false);
        await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathReviveFailures.waitForFailedSave(context, TestDeathReviveFailures.STATE_SAVE);
        await TestDeathReviveFailures.expectRevivedWhereItDied(context);
    }

    static async runChangingSceneTownReviveTest(context)
    {
        await TestDeathReviveFailures.killPlayer(context, {}, 0);
        let changed = await GameplayE2eStateApi.changePlayerBody(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            {isChangingScene: true}
        );
        expect(changed.changed, 'The body must be changing scene: '+changed.error).toEqual(['isChangingScene']);
        await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathReviveFailures.expectRevivedWhereItDied(context);
    }

    static async runUnavailableTownTest(context)
    {
        await TestDeathReviveFailures.killPlayer(context, {}, 0);
        await WorldE2eStateApi.blockSceneChanges(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameOverTimeOut + TimeConstants.PLAYER_REVIVE
        );
        await DeathReviveSteps.expectTownGameOverMessage(context, 0);
        await TestDeathReviveFailures.expectRevivedWhereItDied(context);
        await WorldE2eStateApi.unblockSceneChanges(context.gameConfig, Login.FOREST_ROOM_NAME);
    }

    static run()
    {
        test.describe('Death Revive Failures', () => {
            test('rejected stats save in the town revive keeps the player dead until the retry revives it in town', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveFailures.runTownReviveRetryTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('rejected stats save in the in place revive leaves the player active with the game over box open', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveFailures.runInPlaceReviveFailedSaveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('rejected stats save after the restoration item was consumed consumes exactly one item', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveFailures.runConsumedItemRetryTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('failed relocation state save revives the player where it died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveFailures.runFailedRelocationSaveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('town revive of a body already changing scene skips the relocation and revives in place', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveFailures.runChangingSceneTownReviveTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('town room not available revives the player where it died', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathReviveFailures.runUnavailableTownTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathReviveFailures.run();
