/**
 *
 * Reldens - WorldPositionCalculator
 *
 * Calculates world position coordinates from grid nodes and tile dimensions.
 *
 */

class WorldPositionCalculator
{

    /**
     * @param {Object} node
     * @param {number} node.x
     * @param {number} node.y
     * @param {number} tileWidth
     * @param {number} tileHeight
     * @returns {Object}
     */
    forNode(node, tileWidth, tileHeight)
    {
        return {
            x: node.x * tileWidth + (tileWidth / 2),
            y: node.y * tileHeight + (tileHeight / 2)
        };
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {Object} [mapJson]
     * @returns {{currentCol: number, currentRow: number}}
     */
    toTiles(x, y, mapJson)
    {
        let tileWidth = mapJson?.tilewidth;
        let tileHeight = mapJson?.tileheight;
        let currentCol = Math.round((x - (tileWidth/2)) / tileWidth);
        currentCol = (0 <= currentCol) ? ((currentCol > mapJson?.width) ? (mapJson?.width) : currentCol) : 0;
        let currentRow = Math.round((y - (tileHeight/2)) / tileHeight);
        currentRow = (0 <= currentRow) ? ((currentRow > mapJson?.height) ? (mapJson?.height) : currentRow) : 0;
        return {currentCol, currentRow};
    }

}

module.exports.WorldPositionCalculator = new WorldPositionCalculator();
