/**
 *
 * Reldens - Player Movement Cases
 *
 * Runs one player movement case and reports its failure with the server trail: the pointer move to a walkable tile,
 * the pointer move to a blocked tile, the pointer move across a blocked tile, the direction movement against a wall
 * and the pointer path into an object body. The cases that need a start tile report themselves as skipped when the
 * player can not reach it, so the spec only counts the cases that really ran.
 *
 */

const { Navigation } = require('./navigation');
const { MovementScenario } = require('./movement-scenario');
const { RoomMovementApi } = require('./room-movement-api');
const { RoomObjectsApi } = require('./room-objects-api');
const { WalkableTileLocator } = require('./walkable-tile-locator');

class PlayerMovementCases
{

    static WALK_MS = 1200;

    static async fetchObjectsTiles(context)
    {
        return (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, context.roomName)).map(
            roomObject => [roomObject.currentCol, roomObject.currentRow]
        );
    }

    static async isRouteClear(context, routeTiles)
    {
        let objectsTiles = await PlayerMovementCases.fetchObjectsTiles(context);
        let player = await context.fetchPlayer();
        let routeFrom = [player.currentCol, player.currentRow];
        for(let routeTile of routeTiles){
            let path = await RoomMovementApi.fetchPath(context.gameConfig, context.roomName, routeFrom, routeTile);
            if(!WalkableTileLocator.isPathClearOfTiles(path, objectsTiles)){
                return false;
            }
            routeFrom = routeTile;
        }
        return true;
    }

    static async findClearTarget(context, from, tiles, offset)
    {
        let objectsTiles = await PlayerMovementCases.fetchObjectsTiles(context);
        let candidates = [
            ...WalkableTileLocator.findWalkableTilesNearOffset(tiles, from, offset),
            ...WalkableTileLocator.findWalkableTilesNearOffset(tiles, from, [-offset[0], -offset[1]])
        ];
        for(let candidate of candidates){
            let path = await RoomMovementApi.fetchPath(context.gameConfig, context.roomName, from, candidate);
            if(WalkableTileLocator.isPathClearOfTiles(path, objectsTiles)){
                return candidate;
            }
        }
        return false;
    }

    static async runPointerWalkableCase(page, context, pointerCase)
    {
        let player = await context.fetchPlayer();
        let from = [player.currentCol, player.currentRow];
        let tiles = await context.fetchTiles(from, MovementScenario.TILES_RADIUS);
        let target = await PlayerMovementCases.findClearTarget(context, from, tiles, pointerCase.offset);
        if(!target){
            return {case: pointerCase.name, from, error: 'No walkable tile with a path clear of the room objects.'};
        }
        let movement = await MovementScenario.movePlayer(page, context, target, context.navTimeout);
        let blockedTiles = MovementScenario.findBlockedTrailTiles(movement.trail, tiles);
        if(movement.done && 0 === blockedTiles.length){
            return false;
        }
        return {case: pointerCase.name, from, target, arrived: movement.done, blockedTiles, last: movement.last};
    }

    static async runPointerBlockedCase(page, context, blockedTarget)
    {
        let point = WalkableTileLocator.worldPoint(blockedTarget.tile);
        await Navigation.moveToWorldPoint(page, point.x, point.y);
        await page.waitForTimeout(MovementScenario.PATH_CHECK_MS);
        let movement = await RoomMovementApi.collectTrail(context.fetchPlayer, context.isStill, context.navTimeout);
        let roomName = await Navigation.getCurrentRoomName(page);
        let blockedTiles = MovementScenario.findBlockedTrailTiles(movement.trail, context.tiles);
        if(movement.done && 0 === blockedTiles.length && context.roomName === roomName){
            return false;
        }
        return {target: blockedTarget, stopped: movement.done, roomName, blockedTiles, last: movement.last};
    }

    static async runCrossingCase(page, context, crossing)
    {
        if(!await PlayerMovementCases.isRouteClear(context, [crossing.start, crossing.target])){
            return {skipped: true};
        }
        let toStart = await MovementScenario.movePlayer(page, context, crossing.start, context.navTimeout);
        if(!toStart.done){
            return {skipped: true};
        }
        let toTarget = await MovementScenario.movePlayer(page, context, crossing.target, context.navTimeout);
        if(!toTarget.done && !toTarget.trail.some(player => player && 0 < player.pathSteps)){
            return {skipped: true};
        }
        let blockedTiles = MovementScenario.findBlockedTrailTiles(toTarget.trail, context.tiles);
        if(toTarget.done && 0 === blockedTiles.length){
            return {skipped: false, failure: false};
        }
        return {skipped: false, failure: {crossing, arrived: toTarget.done, blockedTiles, last: toTarget.last}};
    }

    static async runWallApproachCase(page, context, approach)
    {
        if(!await PlayerMovementCases.isRouteClear(context, [approach.start])){
            return {skipped: true};
        }
        let toStart = await MovementScenario.movePlayer(page, context, approach.start, context.navTimeout);
        if(!toStart.done){
            return {skipped: true};
        }
        let pushResults = await Promise.all([
            Navigation.walkInDirection(page, approach.direction.arrowKey, PlayerMovementCases.WALK_MS),
            RoomMovementApi.collectTrail(context.fetchPlayer, () => false, PlayerMovementCases.WALK_MS)
        ]);
        let afterPush = await RoomMovementApi.collectTrail(context.fetchPlayer, context.isStill, context.navTimeout);
        let wallTiles = MovementScenario.findBlockedTrailTiles(
            [...pushResults[1].trail, ...afterPush.trail],
            context.tiles
        ).filter(blockedTile => 'walls' === blockedTile.kind);
        if(afterPush.done && 0 === wallTiles.length){
            return {skipped: false, failure: false};
        }
        return {
            skipped: false,
            failure: {wall: approach.wall, direction: approach.direction.name, stopped: afterPush.done, wallTiles}
        };
    }

    static async runObjectBodyCase(page, context, objectCase)
    {
        let toStart = await MovementScenario.movePlayer(page, context, objectCase.start, context.navTimeout);
        if(!toStart.done){
            return {skipped: true};
        }
        let point = WalkableTileLocator.worldPoint(objectCase.target);
        await Navigation.moveToWorldPoint(page, point.x, point.y);
        let pushing = await RoomMovementApi.collectTrail(
            context.fetchPlayer,
            () => false,
            MovementScenario.SETTLE_MS * 2
        );
        await page.evaluate(() => window.reldens.getActiveScene().player.stop());
        let objectTile = [
            (objectCase.start[0] + objectCase.target[0]) / 2,
            (objectCase.start[1] + objectCase.target[1]) / 2
        ];
        let crossedObject = pushing.trail.some(
            player => player && objectTile[0] === player.currentCol && objectTile[1] === player.currentRow
        );
        let blockedTiles = MovementScenario.findBlockedTrailTiles(pushing.trail, context.objectTiles);
        if(!crossedObject && 0 === blockedTiles.length){
            return {skipped: false, failure: false};
        }
        return {skipped: false, failure: {objectCase, crossedObject, blockedTiles, last: pushing.last}};
    }

}

module.exports.PlayerMovementCases = PlayerMovementCases;
