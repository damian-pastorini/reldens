/**
 *
 * Reldens - Test Timing Objects Lock
 *
 * Tests the player lock of the timing objects (server/objects/timing/lockPlayer, ISSUE #70) on the first forest mining
 * rock (TimingMiningSteps, the lockPlayer of the live rock changed for the group): with the lock on a direction key held
 * against the rock keeps the mining and it completes with the reward; the direction keys and the pointer moves sent while
 * mining are refused and the player stays on its tile, and it moves again once the mining completed; a player walking
 * with a direction key or on a pointer path when the mining starts is stopped and the mining completes; the X text over the rock cancels the mining with no reward,
 * the text is removed and the player can move; the Esc key pressed while writing in the chat input cancels nothing and
 * once out of it cancels the mining the same way; an enemy hit (cancelOnHit) still cancels the locked mining and the hit
 * player can move again; with two players mining two rocks the Esc of the first one cancels only its own mining; and
 * with the lock off (the stored default) no X text is shown, Esc cancels nothing and a move still cancels the mining.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Navigation } = require('./helpers/navigation');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { ChatSteps } = require('./helpers/chat-steps');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsLock
{

    static LOCKED = {lockPlayer: true};
    static KEY_WALK_MS = 500;
    static ESCAPE_KEY = 'Escape';

    static async startLockedMining(context, page = context.page)
    {
        let mining = await TimingMiningSteps.prepare(context, TestTimingObjectsLock.LOCKED);
        await TimingObjectSession.startTiming(page, mining.rockKey, mining.serverTimeout);
        mining.position = await Phaser.getPlayerServerPosition(page);
        return mining;
    }

    static async fetchHasCancelText(page, rockKey)
    {
        return await page.evaluate(
            (objectKey) => Boolean(window.reldens.getActiveScene().objectsAnimations[objectKey]?.cancelButton),
            rockKey
        );
    }

    static async tryMoves(page, mining)
    {
        let direction = await TimingMiningSteps.fetchSideWalkDirection(page, mining.position, mining.rock);
        await Navigation.walkInDirection(page, direction, TestTimingObjectsLock.KEY_WALK_MS);
        await TimingObjectSession.sideStep(page);
        await page.waitForTimeout(TimeConstants.ACTION);
    }

    static async expectMovesAgain(page, mining, message)
    {
        let position = await Phaser.getPlayerServerPosition(page);
        await TimingObjectSession.sideStep(page);
        await expect.poll(
            async () => await Phaser.getPlayerServerPosition(page),
            {message, timeout: mining.serverTimeout}
        ).not.toEqual(position);
    }

    static async expectCancelledUnlocked(page, mining, message)
    {
        await TimingMiningSteps.expectCancelled(page, mining, message);
        expect(await TestTimingObjectsLock.fetchHasCancelText(page, mining.rockKey), message+': the X text is removed')
            .toBe(false);
        await TestTimingObjectsLock.expectMovesAgain(page, mining, message+': the player moves again');
    }

    static async pressEscapeOnCanvas(page)
    {
        await page.locator(Selectors.canvas).focus();
        await page.keyboard.press(TestTimingObjectsLock.ESCAPE_KEY);
    }

    static async runBlockedKeyTest(context)
    {
        let mining = await TestTimingObjectsLock.startLockedMining(context);
        let isBesideRock = TimingMiningSteps.isBesideRock(mining.position, mining.rock);
        let axis = isBesideRock ? 'x' : 'y';
        let towardsRock = mining.position[axis] < mining.rock[axis]
            ? (isBesideRock ? 'right' : 'down')
            : (isBesideRock ? 'left' : 'up');
        await Navigation.walkInDirection(context.page, towardsRock, mining.duration / 2);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'A key held against the rock keeps the locked mining');
    }

    static async runRefusedMovesTest(context)
    {
        let mining = await TestTimingObjectsLock.startLockedMining(context);
        await TestTimingObjectsLock.tryMoves(context.page, mining);
        expect(await Phaser.getPlayerServerPosition(context.page), 'The key and pointer moves are refused while locked')
            .toEqual(mining.position);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The locked mining completes');
        await TestTimingObjectsLock.expectMovesAgain(context.page, mining, 'The player moves after the completion');
    }

    static async expectStoppedByStart(context, mining, message)
    {
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.START, mining.serverTimeout);
        let stopped = await RoomMovementApi.waitForPlayerSettled(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            mining.serverTimeout
        );
        await context.page.waitForTimeout(TestTimingObjectsLock.KEY_WALK_MS);
        let afterWalk = await RoomMovementApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName);
        expect([afterWalk.x, afterWalk.y, afterWalk.velocityX, afterWalk.velocityY], message).toEqual([stopped.x, stopped.y, 0, 0]);
    }

    static async runWalkingStartTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context, TestTimingObjectsLock.LOCKED);
        await TimingMiningSteps.startWalkingInteraction(context.page, mining);
        await TestTimingObjectsLock.expectStoppedByStart(context, mining, 'The walking player is stopped by the locked start');
        await context.page.evaluate(() => window.reldens.getActiveScene().player.stop());
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The locked mining of a walking player completes');
    }

    static async runPointerPathStartTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context, TestTimingObjectsLock.LOCKED);
        let pathTile = await RoomMovementApi.fetchClearLineTile(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            TimingMiningSteps.OUT_OF_AREA_DISTANCES
        );
        expect(pathTile, 'A clear line of tiles must start on the miner').toBeTruthy();
        let pathPoint = WalkableTileLocator.worldPoint(pathTile);
        await TimingObjectSession.recordTimingActions(context.page);
        await Navigation.moveToWorldPoint(context.page, pathPoint.x, pathPoint.y);
        expect(await Phaser.triggerObjectInteraction(context.page, mining.rockKey), 'The interaction is sent').toBeTruthy();
        await TestTimingObjectsLock.expectStoppedByStart(context, mining, 'The player on a pointer path is stopped');
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The locked mining of a player on a path completes');
    }

    static async runCancelTextTest(context)
    {
        let mining = await TestTimingObjectsLock.startLockedMining(context);
        expect(await TestTimingObjectsLock.fetchHasCancelText(context.page, mining.rockKey), 'The X text is shown')
            .toBe(true);
        await context.page.evaluate(
            (objectKey) => window.reldens.getActiveScene().objectsAnimations[objectKey].cancelButton.emit('pointerdown'),
            mining.rockKey
        );
        await TestTimingObjectsLock.expectCancelledUnlocked(context.page, mining, 'The X text cancels the mining');
    }

    static async runEscapeTest(context)
    {
        let mining = await TestTimingObjectsLock.startLockedMining(context);
        await ChatSteps.openChat(context.page);
        await context.page.locator(Selectors.chat.input).focus();
        await context.page.keyboard.press(TestTimingObjectsLock.ESCAPE_KEY);
        await context.page.waitForTimeout(TimeConstants.ACTION);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'Esc inside the chat input cancels nothing')
            .toEqual([TimingMiningSteps.START]);
        await context.page.locator(Selectors.chat.input).blur();
        await TestTimingObjectsLock.pressEscapeOnCanvas(context.page);
        await TestTimingObjectsLock.expectCancelledUnlocked(context.page, mining, 'Esc cancels the mining');
    }

    static async runEnemyHitTest(context)
    {
        let mining = await TestTimingObjectsLock.startLockedMining(context);
        await TimingMiningSteps.startPassiveEnemyAttack(context.gameConfig);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.CANCEL, mining.duration);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME);
        await TestTimingObjectsLock.expectCancelledUnlocked(context.page, mining, 'The enemy hit cancels the locked mining');
    }

    static async runTwoMinersTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context, TestTimingObjectsLock.LOCKED);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        let secondConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondConfig, context.longRun);
        let otherRock = (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, Login.FOREST_ROOM_NAME)).find(
            snapshot => context.gameConfig.e2eMiningRockKey === snapshot.assetKey
                && mining.rockKey !== snapshot.bodyKey
                && GameConst.STATUS.ACTIVE === snapshot.inState
        );
        expect(otherRock, 'Another active mining rock must exist').toBeTruthy();
        await TimingObjectSession.changeObjectProperty(context.gameConfig, context.e2eGroup, otherRock.bodyKey, 'lockPlayer', true);
        let placed = await RoomObjectsApi.placePlayerNextToObject(
            context.secondPage,
            secondConfig,
            Login.FOREST_ROOM_NAME,
            otherRock.key,
            TimeConstants.SCENE_LOAD
        );
        expect(placed.reached, 'The second miner is placed next to the other rock').toBe(true);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingObjectSession.startTiming(context.secondPage, otherRock.bodyKey, mining.serverTimeout);
        await TestTimingObjectsLock.pressEscapeOnCanvas(context.page);
        await TimingMiningSteps.expectCancelled(context.page, mining, 'The first miner Esc cancels its mining');
        await TimingObjectSession.waitForTimingAction(context.secondPage, TimingMiningSteps.COMPLETE, mining.serverTimeout);
        expect(await TimingObjectSession.fetchRecordedActions(context.secondPage), 'The second mining completes')
            .toEqual([TimingMiningSteps.START, TimingMiningSteps.COMPLETE]);
    }

    static async runLockOffTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        expect(mining.rock.lockPlayer, 'The stored rocks keep the lock off').toBe(false);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        expect(await TestTimingObjectsLock.fetchHasCancelText(context.page, mining.rockKey), 'No X text with the lock off')
            .toBe(false);
        await TestTimingObjectsLock.pressEscapeOnCanvas(context.page);
        await context.page.waitForTimeout(TimeConstants.ACTION);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'Esc cancels nothing with the lock off')
            .toEqual([TimingMiningSteps.START]);
        await TimingObjectSession.sideStep(context.page);
        await TimingMiningSteps.expectCancelled(context.page, mining, 'A move still cancels the mining with the lock off');
    }

    static run()
    {
        test.describe('Timing Objects Lock', () => {
            test('lock on: a direction key held against the rock keeps the mining and it completes', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runBlockedKeyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lock on: the key and pointer moves are refused while mining and the player moves after it completed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runRefusedMovesTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lock on: a player walking when the mining starts is stopped and the mining completes', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runWalkingStartTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lock on: a player on a pointer path when the mining starts is stopped and the mining completes', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runPointerPathStartTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lock on: the X text cancels the mining with no reward and the player moves again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runCancelTextTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lock on: Esc in the chat input cancels nothing and Esc out of it cancels the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runEscapeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lock on: an enemy hit cancels the locked mining and the hit player moves again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runEnemyHitTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lock on: the Esc of one of two miners cancels only its own mining', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runTwoMinersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('lock off: no X text, Esc cancels nothing and a move still cancels the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsLock.runLockOffTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsLock.run();
