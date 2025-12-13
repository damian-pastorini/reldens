/**
 *
 * Reldens - WorldPointsValidator
 *
 * Validates and clamps world coordinate points to ensure they stay within the world boundaries.
 *
 */

class WorldPointsValidator
{

    /**
     * @param {number} worldWidth
     * @param {number} worldHeight
     */
    constructor(worldWidth, worldHeight)
    {
        /** @type {number} */
        this.worldWidth = worldWidth;
        /** @type {number} */
        this.worldHeight = worldHeight;
    }

    /**
     * @param {Object} points
     * @param {number} points.column
     * @param {number} points.row
     * @returns {Object}
     */
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
