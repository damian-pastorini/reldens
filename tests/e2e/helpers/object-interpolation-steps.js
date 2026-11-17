/**
 *
 * Reldens - Object Interpolation Steps
 *
 * The town NPC placement and walk back recorded frame by frame on a client (the client that walks or another client
 * of the room): the NPC is placed on a walkable tile next to its original tile, its sprite must land there in one
 * frame, and it walks back to its original tile with its sprite stepping toward the moving body and ending on the
 * stopped body. The long run steps that show the movement are in ClientInterpolationShowcase.
 *
 */

const { expect } = require('@playwright/test');
const { ClientInterpolationShowcase } = require('./client-interpolation-showcase');
const { InterpolationFramesRecorder } = require('./interpolation-frames-recorder');
const { WalkableTileLocator } = require('./walkable-tile-locator');
const { RoomMovementApi } = require('./room-movement-api');
const { Navigation } = require('./navigation');
const { sc } = require('@reldens/utils');

class ObjectInterpolationSteps
{

    static OBJECT_TILES_DISTANCES = [2, 1];

    static async recordPlacementAndWalkBack(mainPage, recordPage, walkContext, npc, longRun)
    {
        let origin = [npc.originalCol, npc.originalRow];
        await ClientInterpolationShowcase.prepareObjectWalk(mainPage, walkContext, origin, longRun);
        let tilesDistances = longRun
            ? ClientInterpolationShowcase.OBJECT_TILES_DISTANCES
            : ObjectInterpolationSteps.OBJECT_TILES_DISTANCES;
        let startTile = ClientInterpolationShowcase.pickObjectStartTile(
            WalkableTileLocator.findWalkableTilesAlongDirections(
                await walkContext.fetchTiles(origin, Math.max(npc.maxTiles, ...tilesDistances) + 1),
                origin,
                tilesDistances
            ),
            origin,
            longRun
        );
        expect(startTile, 'A walkable tile must exist next to the object original tile').toBeTruthy();
        await InterpolationFramesRecorder.start(recordPage, {objects: [walkContext.npcKey]});
        let placedNpc = await RoomMovementApi.placeObject(
            walkContext.gameConfig,
            walkContext.roomName,
            walkContext.npcKey,
            startTile
        );
        let isPlacementShown = await InterpolationFramesRecorder.waitForObjectOnBody(
            recordPage,
            walkContext.npcKey,
            {x: placedNpc.x, y: placedNpc.y},
            walkContext.navTimeout
        );
        await ClientInterpolationShowcase.showObjectPlacement(mainPage, startTile, longRun);
        await RoomMovementApi.moveObjectToOriginalTile(walkContext.gameConfig, walkContext.roomName, walkContext.npcKey, false);
        let movement = await RoomMovementApi.collectTrail(
            walkContext.fetchNpc,
            (snapshot) => walkContext.isStill(snapshot) && origin[0] === snapshot.currentCol && origin[1] === snapshot.currentRow,
            walkContext.navTimeout
        );
        let isWalkShown = await InterpolationFramesRecorder.waitForObjectOnBody(
            recordPage,
            walkContext.npcKey,
            false,
            walkContext.navTimeout
        );
        return {
            isPlacementShown,
            movement,
            isWalkShown,
            summary: InterpolationFramesRecorder.summarize(await InterpolationFramesRecorder.stop(recordPage), 'object')
        };
    }

    static expectRecording(recorded, pageErrors)
    {
        let summary = recorded.summary;
        expect(recorded.isPlacementShown, 'The object sprite must land on its placement').toBe(true);
        expect(recorded.movement.done, 'The object must walk back to its original tile: '+sc.toJsonString(recorded.movement.last))
            .toBe(true);
        expect(recorded.isWalkShown, 'The stopped object sprite must end on its body position').toBe(true);
        expect(
            summary.mismatches,
            'Every object frame must follow the interpolation of its entry: '+sc.toJsonString(summary.mismatches)
        ).toEqual([]);
        expect(pageErrors, 'The client must not throw while the object moves').toEqual([]);
        expect(summary.longestPlacedJump, 'The object placement must move its sprite in one frame')
            .toBeGreaterThanOrEqual(Navigation.TILE_SIZE);
        expect(summary.partialMoving, 'The walking object sprite must step toward its moving body').toBeGreaterThan(0);
        expect(summary.objectDepthMismatches, 'The object sprite depth is its Y plus its height on every frame').toBe(0);
    }

}

module.exports.ObjectInterpolationSteps = ObjectInterpolationSteps;
