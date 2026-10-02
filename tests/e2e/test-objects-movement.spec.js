/**
 *
 * Reldens - Test Objects Movement
 *
 * Tests the forest objects movement and aggression: the aggressive and the passive enemies wander inside their own
 * configured areas, the objects without random movement keep their position and a passive enemy does not attack a
 * player standing near it.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { EnemiesWanderSummary } = require('./helpers/enemies-wander-summary');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { ObjectChase } = require('./helpers/object-chase');
const { Phaser } = require('./helpers/phaser');
const { PhaserRange } = require('./helpers/phaser-range');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { TimeConstants } = require('./helpers/time-constants');
const { ObjectsConst } = require('../../lib/objects/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestObjectsMovement
{
    static ENEMY_OBJECT_TYPE = 4;
    static FOREST_LISTS = ['npcs', 'traders', 'enemies', 'respawnAreas'];
    static STATIC_SAMPLES = 10;
    static SAMPLE_INTERVAL_MS = 1000;
    static MOVEMENT_TEST_TIMEOUT_MS = 120000;
    static PASSIVE_TEST_TIMEOUT_MS = 240000;
    static PASSIVE_STAND_MIN_TILES = 3;
    static PASSIVE_STAND_MAX_TILES = 4;
    static PASSIVE_WATCH_MS = 5000;

    static loadForestEnemyAreas()
    {
        return BaseE2eTest.loadPlayerRoomEntries('root', ['respawnAreas'], true).filter(
            area => TestObjectsMovement.ENEMY_OBJECT_TYPE === area.childObjectType
        );
    }

    static async fetchActiveForestEnemies(gameConfig, isAggressive)
    {
        return (await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME)).filter(
            snapshot => ObjectsConst.TYPE_ENEMY === snapshot.type
                && isAggressive === snapshot.isAggressive
                && GameConst.STATUS.ACTIVE === snapshot.inState
        );
    }

    static async findClosestPassiveEnemyKey(gameConfig, playerPosition)
    {
        let distances = {};
        for(let snapshot of await TestObjectsMovement.fetchActiveForestEnemies(gameConfig, false)){
            distances[snapshot.key] = Math.hypot(snapshot.x - playerPosition.x, snapshot.y - playerPosition.y);
        }
        return [...Object.keys(distances).sort((keyA, keyB) => distances[keyA] - distances[keyB])].shift();
    }

    static async fetchSceneAnimations(page)
    {
        return page.evaluate(() => {
            let objectsAnimations = window.reldens.getActiveScene().objectsAnimations;
            let animations = [];
            for(let animationKey of Object.keys(objectsAnimations)){
                let animation = objectsAnimations[animationKey];
                animations.push({
                    key: animationKey,
                    assetKey: animation.asset_key,
                    hasSprite: Boolean(animation.sceneSprite)
                });
            }
            return animations;
        });
    }

    static async runEnemiesWanderTest(page, screenshots, gameConfig, longRun, isAggressive)
    {
        test.setTimeout(TimeConstants.forLongRun(TestObjectsMovement.MOVEMENT_TEST_TIMEOUT_MS, longRun));
        let testedAreas = TestObjectsMovement.loadForestEnemyAreas().filter(area => isAggressive === area.isAggressive);
        expect(testedAreas.length, 'The forest must have enemies of this kind with random movement').toBeGreaterThan(0);
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        await screenshots.capture(page, 'forest-enemies-before-wandering');
        let summary = EnemiesWanderSummary.summarize(
            await EnemiesWanderSummary.collectEnemiesSamples(page, gameConfig, isAggressive)
        );
        await screenshots.capture(page, 'forest-enemies-after-wandering');
        expect(summary.freeKeys.length, 'Some enemies must stay out of battle to sample their free movement')
            .toBeGreaterThan(0);
        expect(summary.wanderedKeys.length, 'At least one enemy must wander').toBeGreaterThan(0);
        expect(
            summary.invalidMovements,
            'Every enemy out of battle must only walk to tiles inside its area, walk back inside on its next move when'
            +' it rests outside and drop a path that keeps it blocked'
        ).toEqual([]);
    }

    static async runStaticObjectsTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(TestObjectsMovement.MOVEMENT_TEST_TIMEOUT_MS, longRun));
        let movingAssetKeys = BaseE2eTest.loadPlayerRoomEntries('root', TestObjectsMovement.FOREST_LISTS, true)
            .map(entry => entry.assetKey);
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        let staticKeys = (await TestObjectsMovement.fetchSceneAnimations(page))
            .filter(animation => animation.hasSprite && !movingAssetKeys.includes(animation.assetKey))
            .map(animation => animation.key);
        expect(staticKeys.length, 'The forest must have objects without random movement').toBeGreaterThan(0);
        let ranges = await PhaserRange.collectPositionRanges(
            page,
            staticKeys,
            TestObjectsMovement.STATIC_SAMPLES,
            TestObjectsMovement.SAMPLE_INTERVAL_MS,
            PhaserRange.getObjectsSpritePositions
        );
        await screenshots.capture(page, 'forest-static-objects-sampled');
        let movement = PhaserRange.summarizeMovement(
            ranges,
            Object.fromEntries(staticKeys.map(key => [key, 0])),
            Navigation.TILE_SIZE
        );
        expect(movement.notSynced, 'Every object without random movement must have a sprite').toEqual([]);
        expect(movement.wandered, 'The objects without random movement must keep their position').toEqual([]);
    }

    static async moveNearObject(page, objectKey, timeout)
    {
        let objectPosition = (await PhaserRange.getStateBodiesPositions(page, [objectKey]))[objectKey];
        let playerPosition = await Phaser.getPlayerServerPosition(page);
        let standOffset = [...await PhaserRange.filterWalkableOffsets(
            page,
            objectPosition.x,
            objectPosition.y,
            PhaserRange.approachOffsets(
                (TestObjectsMovement.PASSIVE_STAND_MAX_TILES + 1) * Navigation.TILE_SIZE,
                Navigation.TILE_SIZE,
                playerPosition.x - objectPosition.x,
                playerPosition.y - objectPosition.y
            ).filter(offset => TestObjectsMovement.PASSIVE_STAND_MIN_TILES <= Math.hypot(offset.column, offset.row)),
            Navigation.TILE_SIZE
        )].shift();
        expect(standOffset, 'A walkable tile near the object must exist').toBeTruthy();
        let standPoint = {
            x: objectPosition.x + standOffset.column * Navigation.TILE_SIZE,
            y: objectPosition.y + standOffset.row * Navigation.TILE_SIZE
        };
        expect(
            await ObjectChase.moveToPointWithinRange(page, standPoint, Navigation.TILE_SIZE, timeout),
            'The player must reach the stand point '+standPoint.x+','+standPoint.y+' near the object '+objectKey
        ).toBe(true);
        await PhaserRange.waitForPlayerToStandStill(page, TestObjectsMovement.SAMPLE_INTERVAL_MS * 3);
    }

    static async runPassiveEnemyTest(page, screenshots, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(TestObjectsMovement.PASSIVE_TEST_TIMEOUT_MS, longRun));
        expect(
            TestObjectsMovement.loadForestEnemyAreas().filter(area => !area.isAggressive).length,
            'The forest must have passive enemies'
        ).toBeGreaterThan(0);
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        expect(
            await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true),
            'The aggressive forest enemies must be disabled, so a damage can only come from the passive enemy'
        ).toBeGreaterThan(0);
        let passiveKey = await TestObjectsMovement.findClosestPassiveEnemyKey(
            gameConfig,
            await Phaser.getPlayerServerPosition(page)
        );
        expect(passiveKey, 'An active passive enemy must exist in the forest').toBeTruthy();
        await TestObjectsMovement.moveNearObject(
            page,
            passiveKey,
            TimeConstants.forLongRun(TimeConstants.MAP_CROSSING, longRun)
        );
        await screenshots.capture(page, 'player-near-passive-enemy');
        expect(
            (await TestObjectsMovement.fetchActiveForestEnemies(gameConfig, true)).map(snapshot => snapshot.key),
            'No aggressive enemy may be active while watching the passive one'
        ).toEqual([]);
        let hpBefore = await TestCombatDeath.getPlayerHpFromState(page);
        await page.waitForTimeout(TimeConstants.forLongRun(TestObjectsMovement.PASSIVE_WATCH_MS, longRun));
        await screenshots.capture(page, 'player-after-passive-enemy-watch');
        expect(
            await TestCombatDeath.getPlayerHpFromState(page),
            'A passive enemy must not attack a player standing near it'
        ).toBeGreaterThanOrEqual(hpBefore);
    }

    static run()
    {
        test.describe('Objects Movement', () => {
            test('aggressive forest enemies wander inside their configured area', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectsMovement.runEnemiesWanderTest(page, screenshots, gameConfig, longRun, true);
            });
            test('passive forest enemies wander inside their configured area', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectsMovement.runEnemiesWanderTest(page, screenshots, gameConfig, longRun, false);
            });
            test('forest objects without random movement keep their position', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectsMovement.runStaticObjectsTest(page, screenshots, gameConfig, longRun);
            });
            test('passive forest enemy does not attack a player standing near it', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectsMovement.runPassiveEnemyTest(page, screenshots, gameConfig, longRun);
            });
        });
    }
}

TestObjectsMovement.run();
