/**
 *
 * Reldens - StorageChangePointsCreator
 *
 * Creates the bodies for the change points saved in the storage which do not exist in any map "change-points"
 * layer. The administration panel saves change points as storage records only, so the maps without that layer
 * (like the generated maps) require these bodies to be created from the storage data once every map layer was
 * parsed, otherwise the players would walk over the change point without any room change.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./p2world').P2world} P2world
 */
class StorageChangePointsCreator
{

    /**
     * @param {P2world} world
     * @returns {number}
     */
    createMissingChangePoints(world)
    {
        let createdChangePointsCount = 0;
        for(let tileIndex of Object.keys(sc.get(world, 'changePoints', {}))){
            if(this.createStoredChangePoint(world, tileIndex)){
                createdChangePointsCount++;
            }
        }
        return createdChangePointsCount;
    }

    /**
     * @param {P2world} world
     * @param {string} tileIndex
     * @returns {boolean}
     */
    createStoredChangePoint(world, tileIndex)
    {
        let changePoint = world.changePoints[tileIndex];
        if(world.createdChangePoints[tileIndex]){
            Logger.debug('Change point already created on map.', tileIndex, changePoint);
            return false;
        }
        Logger.warning('Change point saved in the storage was does not exists in the map.', changePoint);
        let {col, row} = world.fetchPositionFromTileIndex(Number(tileIndex));
        if(!this.isWalkablePosition(world, col, row)){
            Logger.error('Missing change point on map cannot be created because node is not walkable.', {
                changePoint,
                tileIndex,
                col,
                row
            });
            return false;
        }
        let createdChangePoint = world.createChangePoint(
            tileIndex,
            world.mapJson.tilewidth,
            world.mapJson.tileheight,
            col,
            row
        );
        if(!createdChangePoint){
            return false;
        }
        world.createdChangePoints[tileIndex] = createdChangePoint;
        this.markPositionAsChangePoint(world, col, row);
        Logger.info('Created missing change point in map.', changePoint, tileIndex, col, row);
        return true;
    }

    /**
     * @param {P2world} world
     * @param {number} col
     * @param {number} row
     * @returns {boolean}
     */
    isWalkablePosition(world, col, row)
    {
        if(!world.usePathFinder || !world.pathFinder){
            return true;
        }
        return world.pathFinder.grid.isWalkableAt(col, row);
    }

    /**
     * @param {P2world} world
     * @param {number} col
     * @param {number} row
     * @returns {boolean}
     */
    markPositionAsChangePoint(world, col, row)
    {
        if(!world.usePathFinder || !world.pathFinder){
            return false;
        }
        world.pathFinder.grid.setWalkableAt(col, row, false);
        return true;
    }

}

module.exports.StorageChangePointsCreator = StorageChangePointsCreator;
