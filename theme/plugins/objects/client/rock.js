/**
 *
 * Reldens - Rock
 *
 */

const { ToolTimingObject } = require('./tool-timing-object');

class Rock extends ToolTimingObject
{

    constructor(gameManager, props, currentPreloader)
    {
        super(gameManager, props, currentPreloader, {toolType: 'pickaxe', swingAngle: 35, swingDuration: 220});
    }

}

module.exports.Rock = Rock;
