/**
 *
 * Reldens - Walkable Tile Locator
 *
 * Locates the tiles of each movement case over the tiles returned by the room movement tiles endpoint (walkable, walls,
 * change points and the other blocked tiles of the server path finder grid): the walkable tile closest to an offset,
 * the kind of a blocked tile and, for each source tile and direction, the walkable tile standing before it (a wall
 * approach, or the start of a crossing over a blocked tile), sorted by the distance to a tile, plus the world point of
 * a tile and the movement area check of an object, so every movement case is built on the real tiles of the room
 * instead of fixed coordinates.
 *
 */

const { Navigation } = require('./navigation');

class WalkableTileLocator
{

    static DIRECTIONS = [
        {name: 'right', arrowKey: 'ArrowRight', step: [1, 0]},
        {name: 'left', arrowKey: 'ArrowLeft', step: [-1, 0]},
        {name: 'down', arrowKey: 'ArrowDown', step: [0, 1]},
        {name: 'up', arrowKey: 'ArrowUp', step: [0, -1]}
    ];
    static NEIGHBOR_OFFSETS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    static BLOCKED_KINDS = ['walls', 'changePoints', 'otherBlocked'];

    static worldPoint(tile)
    {
        return {
            x: tile[0] * Navigation.TILE_SIZE + Navigation.TILE_SIZE / 2,
            y: tile[1] * Navigation.TILE_SIZE + Navigation.TILE_SIZE / 2
        };
    }

    static isInsideArea(objectSnapshot, tile)
    {
        return objectSnapshot.maxTiles >= Math.abs(tile[0] - objectSnapshot.originalCol)
            && objectSnapshot.maxTiles >= Math.abs(tile[1] - objectSnapshot.originalRow);
    }

    static blockedKind(tiles, tile)
    {
        let tileKey = tile.join(',');
        for(let kind of WalkableTileLocator.BLOCKED_KINDS){
            if(tiles[kind].some(blockedTile => tileKey === blockedTile.join(','))){
                return kind;
            }
        }
        return false;
    }

    static findWalkableNearOffset(tiles, from, offset)
    {
        let candidates = WalkableTileLocator.findWalkableTilesNearOffset(tiles, from, offset);
        if(0 === candidates.length){
            return false;
        }
        return candidates[0];
    }

    static findWalkableTilesNearOffset(tiles, from, offset)
    {
        let target = [from[0] + offset[0], from[1] + offset[1]];
        let candidates = tiles.walkable.filter(
            tile => (tile[0] !== from[0] || tile[1] !== from[1])
                && 1 >= Math.hypot(tile[0] - target[0], tile[1] - target[1])
        );
        candidates.sort(
            (tileA, tileB) => Math.hypot(tileA[0] - target[0], tileA[1] - target[1])
                - Math.hypot(tileB[0] - target[0], tileB[1] - target[1])
        );
        return candidates;
    }

    static isPathClearOfTiles(path, avoidTiles)
    {
        if(0 === path.length){
            return false;
        }
        return !path.some(step => avoidTiles.some(
            avoidTile => 1 >= Math.abs(step[0] - avoidTile[0]) && 1 >= Math.abs(step[1] - avoidTile[1])
        ));
    }

    static findClosestTiles(tiles, from, count)
    {
        let otherTiles = tiles.filter(tile => tile[0] !== from[0] || tile[1] !== from[1]);
        otherTiles.sort(
            (tileA, tileB) => Math.hypot(tileA[0] - from[0], tileA[1] - from[1])
                - Math.hypot(tileB[0] - from[0], tileB[1] - from[1])
        );
        return otherTiles.slice(0, count);
    }

    static findDirectionCases(sourceTiles, walkableTiles, from, mapCase)
    {
        let walkableKeys = new Set(walkableTiles.map(tile => tile.join(',')));
        let cases = [];
        for(let sourceTile of sourceTiles){
            WalkableTileLocator.appendDirectionCases(cases, sourceTile, walkableKeys, mapCase);
        }
        cases.sort(
            (caseA, caseB) => Math.hypot(caseA.start[0] - from[0], caseA.start[1] - from[1])
                - Math.hypot(caseB.start[0] - from[0], caseB.start[1] - from[1])
        );
        return cases;
    }

    static mapCrossingCase(start, blocked, direction, walkableKeys)
    {
        let target = [blocked[0] + direction.step[0], blocked[1] + direction.step[1]];
        if(!walkableKeys.has(target.join(','))){
            return false;
        }
        return {start, blocked, target, direction: direction.name};
    }

    static mapLineAcrossCase(before, middleTile, direction, walkableKeys)
    {
        let start = [middleTile[0] - direction.step[0] * 2, middleTile[1] - direction.step[1] * 2];
        let target = [middleTile[0] + direction.step[0] * 2, middleTile[1] + direction.step[1] * 2];
        if(!walkableKeys.has(start.join(',')) || !walkableKeys.has(target.join(','))){
            return false;
        }
        return {start, target, direction: direction.name};
    }

    static mapLineBeyondCase(before, middleTile, direction, walkableKeys)
    {
        let beyond = [before[0] - direction.step[0], before[1] - direction.step[1]];
        if(!walkableKeys.has(beyond.join(','))){
            return false;
        }
        return {start: before, target: beyond, direction: direction.name};
    }

    static findWalkableAlong(tiles, from, step, distances)
    {
        let walkableKeys = new Set(tiles.walkable.map(tile => tile.join(',')));
        for(let distance of distances){
            let tile = [from[0] + step[0] * distance, from[1] + step[1] * distance];
            if(walkableKeys.has(tile.join(','))){
                return tile;
            }
        }
        return false;
    }

    static appendDirectionCases(cases, sourceTile, walkableKeys, mapCase)
    {
        for(let direction of WalkableTileLocator.DIRECTIONS){
            let start = [sourceTile[0] - direction.step[0], sourceTile[1] - direction.step[1]];
            if(!walkableKeys.has(start.join(','))){
                continue;
            }
            let directionCase = mapCase(start, sourceTile, direction, walkableKeys);
            if(directionCase){
                cases.push(directionCase);
            }
        }
    }

}

module.exports.WalkableTileLocator = WalkableTileLocator;
