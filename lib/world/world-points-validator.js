/**
 *
 * Reldens - WorldPointsValidator
 *
 */

class WorldPointsValidator
{

    constructor(worldWidth, worldHeight)
    {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
    }

    makeValidPoints(points)
    {
        points.column = points.column < 0 ? 0 : points.column;
        points.column = points.column > this.worldWidth ? this.worldWidth : points.column;
        points.row = points.row < 0 ? 0 : points.row;
        points.row = points.row > this.worldHeight ? this.worldHeight : points.row;
        return points;
    }

}

module.exports.WorldPointsValidator = WorldPointsValidator;
