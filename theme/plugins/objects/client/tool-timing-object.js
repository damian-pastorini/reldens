/**
 *
 * Reldens - Theme - ToolTimingObject
 *
 * Timing object that shows its tool animation on the current player while the timing runs.
 *
 */

const { TimingObject } = require('reldens/lib/objects/client/object/type/timing-object');
const { TimingToolAnimation } = require('./timing-tool-animation');

class ToolTimingObject extends TimingObject
{

    /**
     * @param {Object} gameManager
     * @param {Object} props
     * @param {Object} currentPreloader
     * @param {Object} toolConfig
     */
    constructor(gameManager, props, currentPreloader, toolConfig)
    {
        super(gameManager, props, currentPreloader);
        this.timingToolAnimation = new TimingToolAnimation(toolConfig);
    }

    /**
     * @param {Object} message
     */
    onTimingMessage(message)
    {
        super.onTimingMessage(message);
        this.timingToolAnimation.handleTimingMessage(message, this.key, this.sceneSprite, this.gameManager);
    }

}

module.exports.ToolTimingObject = ToolTimingObject;
