/**
 *
 * Reldens - WorldPointsValidator
 *
 * Validates and clamps world coordinate points to ensure they stay within the world boundaries: a column or row past the
 * map is clamped to its last column or row (the width and height minus one, the tiles start at zero).
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
        let lastColumn = this.worldWidth - 1;
        let lastRow = this.worldHeight - 1;
        points.column = points.column < 0 ? 0 : points.column;
        points.column = points.column > lastColumn ? lastColumn : points.column;
        points.row = points.row < 0 ? 0 : points.row;
        points.row = points.row > lastRow ? lastRow : points.row;
        return points;
    }

}

module.exports.WorldPointsValidator = WorldPointsValidator;
