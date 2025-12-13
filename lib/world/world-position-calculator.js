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

}

module.exports.WorldPositionCalculator = new WorldPositionCalculator();
