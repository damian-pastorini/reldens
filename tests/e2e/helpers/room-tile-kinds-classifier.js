/**
 *
 * Reldens - Room Tile Kinds Classifier
 *
 * Classifies the tiles of a live scene room around a tile, from the server path finder grid and the room world bodies:
 * the walkable tiles, the wall tiles (covered by a wall body), the change point tiles and the other blocked tiles
 * (marked not walkable by a path finder layer only), so the movement specs build their cases on the real room tiles.
 *
 */

const { sc } = require('@reldens/utils');

class RoomTileKindsClassifier
{

    static MAX_TILES_RADIUS = 10;

    static classifyTiles(room, column, row, radius)
    {
        let tilesRadius = Math.min(Math.max(radius, 1), RoomTileKindsClassifier.MAX_TILES_RADIUS);
        let tiles = {walkable: [], walls: [], changePoints: [], otherBlocked: []};
        let tilesSource = {
            roomWorld: room.roomWorld,
            grid: room.roomWorld.pathFinder.grid,
            wallTileIndexes: RoomTileKindsClassifier.fetchWallTileIndexes(room.roomWorld)
        };
        for(let tileColumn = column - tilesRadius; tileColumn <= column + tilesRadius; tileColumn++){
            RoomTileKindsClassifier.appendColumnTiles(tilesSource, tileColumn, row, tilesRadius, tiles);
        }
        return tiles;
    }

    static fetchWallTileIndexes(roomWorld)
    {
        let wallTileIndexes = new Set();
        for(let body of roomWorld.bodies){
            if(!body.isWall || !sc.isArray(body.tileIndexes)){
                continue;
            }
            RoomTileKindsClassifier.addWallTileIndexes(body.tileIndexes, wallTileIndexes);
        }
        return wallTileIndexes;
    }

    static addWallTileIndexes(tileIndexes, wallTileIndexes)
    {
        for(let tileIndex of tileIndexes){
            wallTileIndexes.add(tileIndex);
        }
    }

    static appendColumnTiles(tilesSource, tileColumn, row, tilesRadius, tiles)
    {
        for(let tileRow = row - tilesRadius; tileRow <= row + tilesRadius; tileRow++){
            if(!tilesSource.grid.isInside(tileColumn, tileRow)){
                continue;
            }
            tiles[RoomTileKindsClassifier.classifyTile(tilesSource, tileColumn, tileRow)].push([tileColumn, tileRow]);
        }
    }

    static classifyTile(tilesSource, tileColumn, tileRow)
    {
        if(tilesSource.grid.isWalkableAt(tileColumn, tileRow)){
            return 'walkable';
        }
        let tileIndex = tilesSource.roomWorld.tileIndexByRowAndColumn(tileRow, tileColumn);
        if(tilesSource.wallTileIndexes.has(tileIndex)){
            return 'walls';
        }
        if(sc.get(tilesSource.roomWorld.createdChangePoints, tileIndex, false)){
            return 'changePoints';
        }
        return 'otherBlocked';
    }

}

module.exports.RoomTileKindsClassifier = RoomTileKindsClassifier;
