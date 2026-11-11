/**
 *
 * Reldens - Test Timing Objects Rules
 *
 * Tests the movement rules of a timing object on the first forest mining rock (TimingMiningSteps, its cancel rules
 * changed for the group on the live rock): the stored rocks and fishing spots keep the out of range rule off; with it
 * on (the move rule off) leaving the rock interaction area cancels with one timingCancel, no reward and the rock still
 * active, colliding and without a new respawn; with it on, a short walk along the rock side keeps the mining and it
 * rewards; with the move rule off (the out of range rule on or off) the mining completes after a short walk or after
 * leaving the area; a cancelled mining started again on the same rock (once the server shows the player stopped, a body
 * still moving cancels the new mining by the move rule) completes with one reward; a player still walking
 * when the mining starts is cancelled; a direction key held against the rock starts the mining touching it (the
 * collision moves the body back, so the move rule cancels it, ISSUE #70); and a move after timingComplete sends no
 * timingCancel.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsRules
{

    static FISHING_SPOT_KEY = 'fish_spawn_forest_1';
    static BLOCKED_WALK_MS = 1000;
    static HORIZONTAL_DIRECTIONS = {increase: 'right', decrease: 'left'};
    static VERTICAL_DIRECTIONS = {increase: 'down', decrease: 'up'};

    static async runOutOfRangeCancelTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let fishingSpot = await TimingObjectSession.fetchTimingState(context.gameConfig, TestTimingObjectsRules.FISHING_SPOT_KEY);
        expect([mining.rock.cancelOnOutOfRange, fishingSpot.cancelOnOutOfRange], 'The stored objects keep the rule off')
            .toEqual([false, false]);
        await TimingObjectSession.changeObjectProperty(context.gameConfig, context.e2eGroup, mining.rockKey, 'cancelOnMove', false);
        await TimingObjectSession.changeObjectProperty(context.gameConfig, context.e2eGroup, mining.rockKey, 'cancelOnOutOfRange', true);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.walkOutOfArea(context, mining);
        await TimingMiningSteps.expectCancelled(context.page, mining, 'Leaving the area cancels');
        let rockAfter = await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey);
        expect(
            [rockAfter.isActive, rockAfter.inState, rockAfter.collides, rockAfter.respawnTimerId],
            'The cancelled rock stays active and colliding with no new respawn'
        ).toEqual([false, GameConst.STATUS.ACTIVE, true, mining.rock.respawnTimerId]);
    }

    static async runInsideAreaWalkTest(context, rules, message)
    {
        let mining = await TimingMiningSteps.prepare(context, rules);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.walkInsideArea(context.page, mining);
        await TimingMiningSteps.expectCompleted(context.page, mining, message);
    }

    static async runOutOfAreaWalkTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context, {cancelOnMove: false, cancelOnOutOfRange: false});
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.walkOutOfArea(context, mining);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'Both rules off keeps the mining out of the area');
    }

    static async runRestartTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.walkInsideArea(context.page, mining);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.CANCEL, mining.serverTimeout);
        await expect.poll(
            async () => (await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey)).isActive,
            {message: 'The cancelled rock is free', timeout: mining.serverTimeout}
        ).toBe(false);
        await RoomMovementApi.waitForPlayerStill(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            mining.serverTimeout
        );
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The restarted mining completes');
    }

    static async runWalkingStartTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let position = await Phaser.getPlayerServerPosition(context.page);
        let direction = await TimingMiningSteps.fetchSideWalkDirection(context.page, position, mining.rock);
        await TimingObjectSession.recordTimingActions(context.page);
        await context.page.evaluate((walkDirection) => window.reldens.getActiveScene().player[walkDirection](), direction);
        expect(await Phaser.triggerObjectInteraction(context.page, mining.rockKey), 'The interaction is sent').toBeTruthy();
        await context.page.waitForTimeout(TimingMiningSteps.SHORT_WALK_MS);
        await context.page.evaluate(() => window.reldens.getActiveScene().player.stop());
        await TimingMiningSteps.expectCancelled(context.page, mining, 'A player walking on the start is cancelled');
    }

    static async runBlockedKeyTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let position = await Phaser.getPlayerServerPosition(context.page);
        let isBesideRock = TimingMiningSteps.isBesideRock(position, mining.rock);
        let axis = isBesideRock ? 'x' : 'y';
        let directions = isBesideRock ? TestTimingObjectsRules.HORIZONTAL_DIRECTIONS : TestTimingObjectsRules.VERTICAL_DIRECTIONS;
        let towardsRock = position[axis] < mining.rock[axis] ? directions.increase : directions.decrease;
        await Navigation.walkInDirection(context.page, towardsRock, TestTimingObjectsRules.BLOCKED_WALK_MS);
        let touchingPosition = await Phaser.getPlayerServerPosition(context.page);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await Navigation.walkInDirection(context.page, towardsRock, TestTimingObjectsRules.BLOCKED_WALK_MS);
        await context.page.waitForTimeout(mining.duration);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'The mining started against the rock')
            .toContain(TimingMiningSteps.START);
        expect(touchingPosition, 'The player touched the rock').toBeTruthy();
    }

    static async runMoveAfterCompleteTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The mining completes');
        await TimingObjectSession.sideStep(context.page);
        await context.page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'No cancel after the completion')
            .toEqual([TimingMiningSteps.START, TimingMiningSteps.COMPLETE]);
    }

    static run()
    {
        test.describe('Timing Objects Rules', () => {
            test('out of range rule on: leaving the rock area cancels once and keeps the rock', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRules.runOutOfRangeCancelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('out of range rule on: a walk inside the rock area keeps the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRules.runInsideAreaWalkTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {cancelOnMove: false, cancelOnOutOfRange: true},
                    'A walk inside the area keeps the mining'
                );
            });
            test('move rule off: a walk keeps the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRules.runInsideAreaWalkTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {cancelOnMove: false},
                    'The move rule off keeps the mining'
                );
            });
            test('both rules off: leaving the rock area keeps the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRules.runOutOfAreaWalkTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('cancelled mining started again completes with one reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRules.runRestartTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player walking when the mining starts is cancelled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRules.runWalkingStartTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('direction key against the rock keeps the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRules.runBlockedKeyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('move after the completion sends no cancel', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsRules.runMoveAfterCompleteTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsRules.run();
