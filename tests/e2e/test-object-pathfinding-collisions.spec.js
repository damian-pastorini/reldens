/**
 *
 * Reldens - Test Object Pathfinding And Collisions
 *
 * Tests the movement of the e2eNpcKey town object (a body with random movement) on the real tiles read from the server
 * path finder grid: the one tile paths to every neighbor tile with and without the movement area grid (the path finder
 * retry with a single step path), the paths with the area grid to tiles inside and outside the area, the move back to
 * the original tile, the walk back of a body placed outside its area and the path that runs into the player. Every case
 * asserts the server object body: the tile it ends on, the path it follows, its velocity and every tile it crossed.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { MovementScenario } = require('./helpers/movement-scenario');
const { ObjectMovementCases } = require('./helpers/object-movement-cases');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestObjectPathfindingCollisions
{

    static AREA_TILES_MARGIN = 3;
    static AREA_GRID_OPTIONS = [true, false];
    static MAX_CASE_ATTEMPTS = 4;
    static ORIGINAL_TILE_DISTANCES = [2, 1];

    static async startTest(page, gameConfig, longRun)
    {
        test.setTimeout(TimeConstants.forLongRun(MovementScenario.TEST_TIMEOUT_MS, longRun));
        let context = await MovementScenario.start(page, gameConfig, longRun);
        expect(context.npcKey, 'e2eNpcKey must be configured').toBeTruthy();
        let npc = await RoomMovementApi.switchRandomMovement(gameConfig, context.roomName, context.npcKey, false);
        expect(npc, 'The e2eNpcKey object must be in the town room').toBeTruthy();
        expect(npc.maxTiles, 'The e2eNpcKey object must have random movement').toBeGreaterThan(1);
        let origin = [npc.originalCol, npc.originalRow];
        await RoomMovementApi.placeObject(gameConfig, context.roomName, context.npcKey, origin);
        return {
            context,
            setup: {
                npc,
                origin,
                tiles: await context.fetchTiles(origin, npc.maxTiles + TestObjectPathfindingCollisions.AREA_TILES_MARGIN)
            }
        };
    }

    static async restoreObject(context, setup)
    {
        await RoomMovementApi.placeObject(context.gameConfig, context.roomName, context.npcKey, setup.origin);
        await RoomMovementApi.switchRandomMovement(context.gameConfig, context.roomName, context.npcKey, true);
    }

    static async runWithObject(page, gameConfig, longRun, runCases)
    {
        let {context, setup} = await TestObjectPathfindingCollisions.startTest(page, gameConfig, longRun);
        try {
            await runCases(context, setup);
        } finally {
            await TestObjectPathfindingCollisions.restoreObject(context, setup);
        }
    }

    static buildOneTileCases(setup)
    {
        let neighborTiles = WalkableTileLocator.NEIGHBOR_OFFSETS.map(
            offset => [setup.origin[0] + offset[0], setup.origin[1] + offset[1]]
        );
        let oneTileCases = [];
        for(let useAreaGrid of TestObjectPathfindingCollisions.AREA_GRID_OPTIONS){
            oneTileCases.push(...neighborTiles.map(
                tile => ({tile, useAreaGrid, kind: WalkableTileLocator.blockedKind(setup.tiles, tile) || 'walkable'})
            ));
        }
        return oneTileCases;
    }

    static buildAreaCases(setup)
    {
        return [
            ...TestObjectPathfindingCollisions.findTilesAlongDirections(
                setup,
                Array.from({length: setup.npc.maxTiles}, (value, index) => setup.npc.maxTiles - index)
            ).map(tile => ({tile, isInside: true})),
            ...TestObjectPathfindingCollisions.findTilesAlongDirections(
                setup,
                [setup.npc.maxTiles + 1, setup.npc.maxTiles + 2]
            ).map(tile => ({tile, isInside: false}))
        ];
    }

    static findTilesAlongDirections(setup, distances)
    {
        let tiles = [];
        for(let direction of WalkableTileLocator.DIRECTIONS){
            let tile = WalkableTileLocator.findWalkableAlong(setup.tiles, setup.origin, direction.step, distances);
            if(tile){
                tiles.push(tile);
            }
        }
        return tiles;
    }

    static async runOneTilePathsTest(page, screenshots, gameConfig, longRun)
    {
        await TestObjectPathfindingCollisions.runWithObject(page, gameConfig, longRun, async (context, setup) => {
            let failures = await MovementScenario.collectFailures(
                TestObjectPathfindingCollisions.buildOneTileCases(setup),
                async (oneTileCase) => ObjectMovementCases.runOneTileCase(context, setup, oneTileCase)
            );
            await screenshots.capture(page, 'object-one-tile-paths-done');
            expect(failures, 'Every one tile path must end on a walkable tile inside the area').toEqual([]);
        });
    }

    static async runAreaGridPathsTest(page, screenshots, gameConfig, longRun)
    {
        await TestObjectPathfindingCollisions.runWithObject(page, gameConfig, longRun, async (context, setup) => {
            let areaCases = TestObjectPathfindingCollisions.buildAreaCases(setup);
            expect(areaCases.some(areaCase => areaCase.isInside), 'A walkable tile must exist inside the area').toBe(true);
            expect(areaCases.some(areaCase => !areaCase.isInside), 'A walkable tile must exist outside the area').toBe(true);
            let failures = await MovementScenario.collectFailures(
                areaCases,
                async (areaCase) => ObjectMovementCases.runAreaGridCase(context, setup, areaCase)
            );
            await screenshots.capture(page, 'object-area-grid-paths-done');
            expect(failures, 'The area grid paths must reach the tiles inside the area and never the outside ones').toEqual([]);
        });
    }

    static async runOriginalTileTest(page, screenshots, gameConfig, longRun)
    {
        await TestObjectPathfindingCollisions.runWithObject(page, gameConfig, longRun, async (context, setup) => {
            let startTiles = TestObjectPathfindingCollisions.findTilesAlongDirections(
                setup,
                TestObjectPathfindingCollisions.ORIGINAL_TILE_DISTANCES
            );
            expect(startTiles.length, 'A walkable tile must exist next to the original tile').toBeGreaterThan(0);
            let originalCases = TestObjectPathfindingCollisions.AREA_GRID_OPTIONS.map(
                useAreaGrid => ({tile: startTiles[0], useAreaGrid})
            );
            let failures = await MovementScenario.collectFailures(
                originalCases,
                async (originalCase) => ObjectMovementCases.runOriginalTileCase(context, setup, originalCase)
            );
            await screenshots.capture(page, 'object-original-tile-done');
            expect(failures, 'The object must walk back to its original tile with and without the area grid').toEqual([]);
        });
    }

    static async runWalkBackTest(page, screenshots, gameConfig, longRun)
    {
        await TestObjectPathfindingCollisions.runWithObject(page, gameConfig, longRun, async (context, setup) => {
            let maxTiles = setup.npc.maxTiles;
            let outsideTiles = TestObjectPathfindingCollisions.findTilesAlongDirections(setup, [maxTiles + 2, maxTiles + 1]);
            expect(outsideTiles.length, 'A walkable tile must exist outside the area').toBeGreaterThan(0);
            let results = await MovementScenario.runReachableCases(
                outsideTiles,
                TestObjectPathfindingCollisions.MAX_CASE_ATTEMPTS,
                1,
                async (outsideTile) => ObjectMovementCases.runWalkBackCase(context, setup, outsideTile)
            );
            await screenshots.capture(page, 'object-walk-back-done');
            expect(results.checkedCases, 'An object placed outside its area must walk back inside it').toBeGreaterThan(0);
        });
    }

    static async runPathIntoPlayerTest(page, screenshots, gameConfig, longRun)
    {
        await TestObjectPathfindingCollisions.runWithObject(page, gameConfig, longRun, async (context, setup) => {
            let lineCases = WalkableTileLocator.findDirectionCases(
                [setup.origin],
                setup.tiles.walkable,
                setup.origin,
                WalkableTileLocator.mapLineBeyondCase
            );
            expect(lineCases.length, 'Two walkable tiles must exist in line next to the object').toBeGreaterThan(0);
            let results = await MovementScenario.runReachableCases(
                lineCases,
                TestObjectPathfindingCollisions.MAX_CASE_ATTEMPTS,
                1,
                async (lineCase) => ObjectMovementCases.runPathIntoPlayerCase(page, context, setup, lineCase)
            );
            await screenshots.capture(page, 'object-path-into-player-done');
            expect(results.checkedCases, 'The player must reach a tile on the object path').toBeGreaterThan(0);
            expect(results.failures, 'An object path into the player must end inside the area').toEqual([]);
        });
    }

    static run()
    {
        test.describe('Object Pathfinding And Collisions', () => {
            test('object one tile paths to every neighbor tile end on a walkable tile inside its area', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectPathfindingCollisions.runOneTilePathsTest(page, screenshots, gameConfig, longRun);
            });
            test('object paths with the area grid reach the tiles inside the area and never the outside ones', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectPathfindingCollisions.runAreaGridPathsTest(page, screenshots, gameConfig, longRun);
            });
            test('object sent back to its original tile reaches it with and without the area grid', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectPathfindingCollisions.runOriginalTileTest(page, screenshots, gameConfig, longRun);
            });
            test('object placed outside its area walks back inside it', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectPathfindingCollisions.runWalkBackTest(page, screenshots, gameConfig, longRun);
            });
            test('object path into the player ends inside its area without crossing a wall', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestObjectPathfindingCollisions.runPathIntoPlayerTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestObjectPathfindingCollisions.run();
