/**
 *
 * Reldens - Object Movement Cases
 *
 * Runs one movement case of the e2eNpcKey object (its random movement is paused by the spec) and reports its failure
 * with the server trail: the one tile path to a neighbor tile (the case where the path finder retry receives a single
 * step path), the move to a tile with the movement area grid, the move back to the original tile, the walk back of a
 * body placed outside its area and the path that runs into the player standing on it.
 *
 */

const { MovementScenario } = require('./movement-scenario');
const { RoomMovementApi } = require('./room-movement-api');
const { WalkableTileLocator } = require('./walkable-tile-locator');

class ObjectMovementCases
{

    static OBJECT_PATH_TIMEOUT_MS = 8000;

    static findOutsideAreaTiles(trail)
    {
        let outsideTiles = [];
        for(let npc of trail){
            if(npc && !WalkableTileLocator.isInsideArea(npc, [npc.currentCol, npc.currentRow])){
                outsideTiles.push([npc.currentCol, npc.currentRow]);
            }
        }
        return outsideTiles;
    }

    static async startPathFromOrigin(context, setup, path, useAreaGrid)
    {
        await RoomMovementApi.placeObject(context.gameConfig, context.roomName, context.npcKey, setup.origin);
        await RoomMovementApi.setObjectPath(context.gameConfig, context.roomName, context.npcKey, path, useAreaGrid);
    }

    static async runOneTileCase(context, setup, oneTileCase)
    {
        await ObjectMovementCases.startPathFromOrigin(context, setup, [oneTileCase.tile], oneTileCase.useAreaGrid);
        let movement = await RoomMovementApi.collectTrail(
            context.fetchNpc,
            context.isStill,
            ObjectMovementCases.OBJECT_PATH_TIMEOUT_MS
        );
        let lastTile = [movement.last.currentCol, movement.last.currentRow];
        let errors = [];
        if(!movement.done){
            errors.push('The path never ended.');
        }
        if('walls' === WalkableTileLocator.blockedKind(setup.tiles, lastTile)){
            errors.push('The object ended on a wall tile.');
        }
        let isOrthogonalStep = setup.origin[0] === oneTileCase.tile[0] || setup.origin[1] === oneTileCase.tile[1];
        let mustReachTarget = isOrthogonalStep && !WalkableTileLocator.blockedKind(setup.tiles, oneTileCase.tile);
        if(mustReachTarget && (lastTile[0] !== oneTileCase.tile[0] || lastTile[1] !== oneTileCase.tile[1])){
            errors.push('The object did not reach the walkable tile.');
        }
        if(oneTileCase.useAreaGrid && 0 < ObjectMovementCases.findOutsideAreaTiles(movement.trail).length){
            errors.push('The object left its movement area.');
        }
        return 0 === errors.length ? false : {oneTileCase, errors, last: movement.last};
    }

    static async runAreaGridCase(context, setup, areaCase)
    {
        await RoomMovementApi.placeObject(context.gameConfig, context.roomName, context.npcKey, setup.origin);
        await RoomMovementApi.moveObject(context.gameConfig, context.roomName, context.npcKey, areaCase.tile, true);
        if(!areaCase.isInside){
            return ObjectMovementCases.failureWhenDone(
                await RoomMovementApi.collectTrail(
                    context.fetchNpc,
                    (npc) => 0 < npc.pathSteps || setup.origin[0] !== npc.currentCol || setup.origin[1] !== npc.currentRow,
                    MovementScenario.SETTLE_MS
                ),
                {areaCase, error: 'Followed a path outside the area.'}
            );
        }
        let movement = await RoomMovementApi.collectTrail(
            context.fetchNpc,
            (npc) => context.isStill(npc) && areaCase.tile[0] === npc.currentCol && areaCase.tile[1] === npc.currentRow,
            context.navTimeout
        );
        let outsideTiles = ObjectMovementCases.findOutsideAreaTiles(movement.trail);
        if(movement.done && 0 === outsideTiles.length){
            return false;
        }
        return {areaCase, arrived: movement.done, outsideTiles, last: movement.last};
    }

    static async runOriginalTileCase(context, setup, originalCase)
    {
        await RoomMovementApi.placeObject(context.gameConfig, context.roomName, context.npcKey, originalCase.tile);
        await RoomMovementApi.moveObjectToOriginalTile(
            context.gameConfig,
            context.roomName,
            context.npcKey,
            originalCase.useAreaGrid
        );
        return ObjectMovementCases.failureWhenNotDone(
            await RoomMovementApi.collectTrail(
                context.fetchNpc,
                (npc) => context.isStill(npc) && setup.origin[0] === npc.currentCol && setup.origin[1] === npc.currentRow,
                context.navTimeout
            ),
            {originalCase}
        );
    }

    static failureWhenDone(movement, failureData)
    {
        if(!movement.done){
            return false;
        }
        return {...failureData, last: movement.last};
    }

    static failureWhenNotDone(movement, failureData)
    {
        if(movement.done){
            return false;
        }
        return {...failureData, last: movement.last};
    }

    static async runWalkBackCase(context, setup, walkBackTile)
    {
        await RoomMovementApi.placeObject(context.gameConfig, context.roomName, context.npcKey, walkBackTile);
        await RoomMovementApi.switchRandomMovement(context.gameConfig, context.roomName, context.npcKey, true);
        let movement = await RoomMovementApi.collectTrail(
            context.fetchNpc,
            (npc) => context.isStill(npc) && WalkableTileLocator.isInsideArea(npc, [npc.currentCol, npc.currentRow]),
            setup.npc.maxDelay * 2 + context.navTimeout
        );
        await RoomMovementApi.switchRandomMovement(context.gameConfig, context.roomName, context.npcKey, false);
        return movement.done ? {skipped: false, failure: false} : {skipped: true, last: movement.last};
    }

    static async runPathIntoPlayerCase(page, context, setup, lineCase)
    {
        let toPlayerTile = await MovementScenario.movePlayer(page, context, lineCase.start, context.navTimeout);
        if(!toPlayerTile.done){
            return {skipped: true};
        }
        await ObjectMovementCases.startPathFromOrigin(context, setup, [lineCase.start, lineCase.target], true);
        await RoomMovementApi.switchRandomMovement(context.gameConfig, context.roomName, context.npcKey, true);
        let movement = await RoomMovementApi.collectTrail(
            context.fetchNpc,
            (npc) => !npc.path.some(step => lineCase.target[0] === step[0] && lineCase.target[1] === step[1]),
            setup.npc.maxDelay * 2 + context.navTimeout
        );
        await RoomMovementApi.switchRandomMovement(context.gameConfig, context.roomName, context.npcKey, false);
        let outsideTiles = ObjectMovementCases.findOutsideAreaTiles(movement.trail);
        let wallTiles = MovementScenario.findBlockedTrailTiles(movement.trail, setup.tiles).filter(
            blockedTile => 'walls' === blockedTile.kind
        );
        if(movement.done && 0 === outsideTiles.length && 0 === wallTiles.length){
            return {skipped: false, failure: false};
        }
        return {skipped: false, failure: {lineCase, pathEnded: movement.done, outsideTiles, wallTiles}};
    }

}

module.exports.ObjectMovementCases = ObjectMovementCases;
