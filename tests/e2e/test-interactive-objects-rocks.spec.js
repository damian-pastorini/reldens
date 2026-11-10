/**
 *
 * Reldens - Test Interactive Objects Rocks
 *
 * Tests the forest mining rocks lifecycle (TimingMiningSteps, the respawn time shortened for the group on the live
 * rock where the case waits for it): the room holds the respawn instances limit of rocks with distinct keys on distinct
 * tiles; a mined rock is hidden for every client, can be walked through, gets no timing while it waits, and respawns
 * active, shown, colliding and blocking the player again, on a tile where a player standing on the old place is out of
 * reach, and a second player mines it; a player that joins while the rock waits does not see it; and while a rock of
 * the cluster is mined only that rock shows the progress bar, two players on two rocks each see only their own bar and
 * get their own reward, and the first one completing leaves the bar and the timing of the other running.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestInteractiveObjectsRocks
{

    static SHORT_RESPAWN_MS = 2000;
    static LONG_DURATION_MS = 10000;
    static ROCKS_LIMIT = 10;
    static BLOCKED_WALK_MS = 3000;

    static async fetchRocks(gameConfig)
    {
        return (await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME)).filter(
            snapshot => gameConfig.e2eMiningRockKey === snapshot.assetKey
        );
    }

    static async fetchRockVisible(page, rockKey)
    {
        return await page.evaluate(
            (objectKey) => Boolean(window.reldens.getActiveScene().objectsAnimations[objectKey]?.sceneSprite?.visible),
            rockKey
        );
    }

    static async mineRock(context, rules = {})
    {
        let mining = await TimingMiningSteps.prepare(context, rules);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The rock is mined');
        return mining;
    }

    static async enterSecond(context)
    {
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondGameConfig, context.longRun);
        return secondGameConfig;
    }

    static async walkToTile(context, position, timeout)
    {
        let walkContext = MovementScenario.createWalkContext(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            context.longRun
        );
        let tile = [Math.floor(position.x / Navigation.TILE_SIZE), Math.floor(position.y / Navigation.TILE_SIZE)];
        return await MovementScenario.movePlayer(context.page, walkContext, tile, timeout);
    }

    static async runRocksLimitTest(context)
    {
        await TimingObjectSession.enterForestWithoutEnemies(context.page, context.gameConfig, context.longRun);
        let rocks = await TestInteractiveObjectsRocks.fetchRocks(context.gameConfig);
        expect(rocks.length, 'The forest holds the rocks limit').toBe(TestInteractiveObjectsRocks.ROCKS_LIMIT);
        expect(new Set(rocks.map(rock => rock.key)).size, 'Every rock key is distinct').toBe(rocks.length);
        expect(new Set(rocks.map(rock => rock.currentCol+','+rock.currentRow)).size, 'Every rock tile is distinct')
            .toBe(rocks.length);
    }

    static async runMinedRockTest(context)
    {
        let secondGameConfig = await TestInteractiveObjectsRocks.enterSecond(context);
        let mining = await TestInteractiveObjectsRocks.mineRock(context, {respawnTime: TestInteractiveObjectsRocks.SHORT_RESPAWN_MS * 3});
        for(let page of [context.page, context.secondPage]){
            await expect.poll(
                async () => await TestInteractiveObjectsRocks.fetchRockVisible(page, mining.rockKey),
                {message: 'The mined rock is hidden for every client', timeout: mining.serverTimeout}
            ).toBe(false);
        }
        let walked = await TestInteractiveObjectsRocks.walkToTile(context, mining.rock, mining.serverTimeout);
        expect(walked.done, 'The miner walks through the depleted rock tile').toBe(true);
        expect(secondGameConfig.e2ePlayerName, 'The second player is in the forest').toBeTruthy();
    }

    static async runRespawnedRockTest(context)
    {
        let secondGameConfig = await TestInteractiveObjectsRocks.enterSecond(context);
        let mining = await TestInteractiveObjectsRocks.mineRock(context, {respawnTime: TestInteractiveObjectsRocks.SHORT_RESPAWN_MS});
        await expect.poll(
            async () => (await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey)).inState,
            {message: 'The rock respawns', timeout: TestInteractiveObjectsRocks.SHORT_RESPAWN_MS + mining.serverTimeout}
        ).toBe(GameConst.STATUS.ACTIVE);
        let respawned = await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey);
        expect(respawned.collides, 'The respawned rock collides').toBe(true);
        expect({x: respawned.x, y: respawned.y}, 'The rock respawns on a new tile').not.toEqual({x: mining.rock.x, y: mining.rock.y});
        for(let page of [context.page, context.secondPage]){
            await expect.poll(
                async () => await TestInteractiveObjectsRocks.fetchRockVisible(page, mining.rockKey),
                {message: 'The respawned rock is shown for every client', timeout: mining.serverTimeout}
            ).toBe(true);
        }
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout).catch(() => false);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), 'The old place is out of reach').toEqual([]);
        let blocked = await TestInteractiveObjectsRocks.walkToTile(context, respawned, TestInteractiveObjectsRocks.BLOCKED_WALK_MS);
        expect(blocked.done, 'The respawned rock blocks the player').toBe(false);
        let oreBefore = await E2eSeedAndRestoreApi.fetchInventoryQuantity(secondGameConfig, secondGameConfig.e2ePlayerName, mining.rewardItemId);
        let placed = await RoomObjectsApi.placePlayerNextToObject(context.secondPage, secondGameConfig, Login.FOREST_ROOM_NAME, mining.rockKey, TimeConstants.SCENE_LOAD);
        expect(placed.reached, 'The second player is placed next to the respawned rock').toBe(true);
        await TimingObjectSession.startTiming(context.secondPage, mining.rockKey, mining.serverTimeout);
        await TimingObjectSession.waitForTimingAction(context.secondPage, TimingMiningSteps.COMPLETE, mining.duration + mining.serverTimeout);
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.fetchInventoryQuantity(secondGameConfig, secondGameConfig.e2ePlayerName, mining.rewardItemId),
            {message: 'The second player mines the respawned rock', timeout: mining.serverTimeout}
        ).toBe(oreBefore + 1);
    }

    static async runJoinDuringRespawnTest(context)
    {
        let mining = await TestInteractiveObjectsRocks.mineRock(context);
        await TestInteractiveObjectsRocks.enterSecond(context);
        await context.secondPage.waitForTimeout(TimeConstants.ACTION);
        expect(await TestInteractiveObjectsRocks.fetchRockVisible(context.secondPage, mining.rockKey), 'The joining player does not see the rock')
            .toBe(false);
    }

    static async runClusterBarTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        let otherRocks = (await TestInteractiveObjectsRocks.fetchRocks(context.gameConfig)).filter(rock => mining.rockKey !== rock.bodyKey);
        expect(await TimingMiningSteps.fetchClientTiming(context.page, mining.rockKey), 'The mined rock shows the bar')
            .toEqual({hasBar: true, hasBarInterval: true, hasTool: true});
        for(let rock of otherRocks){
            expect(await TimingMiningSteps.fetchClientTiming(context.page, rock.bodyKey), rock.bodyKey+' shows no bar')
                .toEqual({hasBar: false, hasBarInterval: false, hasTool: false});
        }
    }

    static async runTwoRocksBarsTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        let secondGameConfig = await TestInteractiveObjectsRocks.enterSecond(context);
        let otherRock = (await TestInteractiveObjectsRocks.fetchRocks(context.gameConfig)).filter(
            rock => mining.rockKey !== rock.bodyKey && GameConst.STATUS.ACTIVE === rock.inState
        ).shift();
        let placed = await RoomObjectsApi.placePlayerNextToObject(context.secondPage, secondGameConfig, Login.FOREST_ROOM_NAME, otherRock.key, TimeConstants.SCENE_LOAD);
        expect(placed.reached, 'The second miner is placed next to the other rock').toBe(true);
        let otherState = await TimingObjectSession.fetchTimingState(context.gameConfig, otherRock.bodyKey);
        await TimingObjectSession.changeObjectProperty(context.gameConfig, context.e2eGroup, otherRock.bodyKey, 'clientParams', Object.assign(
            {},
            otherState.clientParams,
            {timingDuration: TestInteractiveObjectsRocks.LONG_DURATION_MS}
        ));
        await TimingObjectSession.startTiming(context.secondPage, otherRock.bodyKey, mining.serverTimeout);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        expect(await TimingMiningSteps.fetchClientTiming(context.page, otherRock.bodyKey), 'The first miner sees no bar on the other rock')
            .toEqual({hasBar: false, hasBarInterval: false, hasTool: false});
        expect(await TimingMiningSteps.fetchClientTiming(context.secondPage, mining.rockKey), 'The second miner sees no bar on the first rock')
            .toEqual({hasBar: false, hasBarInterval: false, hasTool: false});
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The first miner completes first');
        expect(await TimingMiningSteps.fetchClientTiming(context.secondPage, otherRock.bodyKey), 'The second bar keeps running')
            .toEqual({hasBar: true, hasBarInterval: true, hasTool: true});
        expect(await TimingObjectSession.fetchRecordedActions(context.secondPage), 'The second timing keeps running')
            .toEqual([TimingMiningSteps.START]);
        await TimingObjectSession.waitForTimingAction(context.secondPage, TimingMiningSteps.COMPLETE, TestInteractiveObjectsRocks.LONG_DURATION_MS);
    }

    static run()
    {
        test.describe('Interactive Objects Rocks', () => {
            test('forest holds the rocks limit on distinct keys and tiles', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRocks.runRocksLimitTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('mined rock is hidden for every client, starts no timing and can be walked through', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRocks.runMinedRockTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('respawned rock is shown, blocks, moved out of reach and mined by a second player', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRocks.runRespawnedRockTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player joining while the rock waits does not see it', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRocks.runJoinDuringRespawnTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('only the mined rock of the cluster shows the bar', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRocks.runClusterBarTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two miners see only their own bar and the first completion leaves the other running', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsRocks.runTwoRocksBarsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestInteractiveObjectsRocks.run();
