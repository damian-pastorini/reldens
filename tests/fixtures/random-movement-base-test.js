/**
 *
 * Reldens - RandomMovementBaseTest
 *
 * Base of the random movement tests: creates the body builder and exposes its tile size and original tile.
 *
 */

const { BaseTest } = require('../base-test');
const { RandomMovementBodyBuilder } = require('./random-movement-body-builder');

class RandomMovementBaseTest extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.bodyBuilder = new RandomMovementBodyBuilder();
        this.tileSize = this.bodyBuilder.tileSize;
        this.originalTile = this.bodyBuilder.tile;
    }

}

module.exports.RandomMovementBaseTest = RandomMovementBaseTest;
