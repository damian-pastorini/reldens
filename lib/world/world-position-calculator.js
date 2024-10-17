/**
 *
 * Reldens - WorldPositionCalculator
 *
 */

class WorldPositionCalculator
{

    forNode(node, tileWidth, tileHeight)
    {
        return {
            x: node.x * tileWidth + (tileWidth / 2),
            y: node.y * tileHeight + (tileHeight / 2)
        };
    }

}

module.exports.WorldPositionCalculator = new WorldPositionCalculator();
