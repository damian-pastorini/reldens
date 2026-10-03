/**
 *
 * Reldens - FishSpawn
 *
 */

const { ToolTimingObject } = require('./tool-timing-object');

class FishSpawn extends ToolTimingObject
{

    constructor(gameManager, props, currentPreloader)
    {
        super(gameManager, props, currentPreloader, {toolType: 'fishing-rod', swingAngle: 8, swingDuration: 700});
    }

}

module.exports.FishSpawn = FishSpawn;
