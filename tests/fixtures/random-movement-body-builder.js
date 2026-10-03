/**
 *
 * Reldens - RandomMovementBodyBuilder
 *
 * Creates an active PhysicalBody centered on a tile of a world with a real PathFinder grid, where every tile is
 * walkable until a test blocks it.
 *
 */

const { Body } = require('p2');
const { PhysicalBody } = require('../../lib/world/server/physical-body');
const { PathFinder } = require('../../lib/world/server/path-finder');
const { GameConst } = require('../../lib/game/constants');

class RandomMovementBodyBuilder
{

    /**
     * @param {number} tileSize
     * @param {number} mapSize
     * @param {number} tile
     */
    constructor(tileSize = 32, mapSize = 30, tile = 10)
    {
        /** @type {number} */
        this.tileSize = tileSize;
        /** @type {number} */
        this.mapSize = mapSize;
        /** @type {number} */
        this.tile = tile;
    }

    /**
     * @returns {PhysicalBody}
     */
    build()
    {
        let world = {
            mapJson: {tilewidth: this.tileSize, tileheight: this.tileSize, width: this.mapSize, height: this.mapSize},
            onlyWalkable: true,
            tryClosestPath: false
        };
        let pathFinder = new PathFinder();
        pathFinder.world = world;
        pathFinder.createGridFromMap();
        world.pathFinder = pathFinder;
        let tileCenter = this.tile * this.tileSize + this.tileSize / 2;
        let body = new PhysicalBody({mass: 1, position: [tileCenter, tileCenter], type: Body.DYNAMIC});
        body.world = world;
        body.bodyState = {inState: GameConst.STATUS.ACTIVE};
        return body;
    }

    /**
     * @param {Object} grid
     * @param {number} column
     * @param {number} firstRow
     * @param {number} lastRow
     */
    blockColumnTiles(grid, column, firstRow, lastRow)
    {
        for(let row = firstRow; row <= lastRow; row++){
            grid.setWalkableAt(column, row, false);
        }
    }

}

module.exports.RandomMovementBodyBuilder = RandomMovementBodyBuilder;
