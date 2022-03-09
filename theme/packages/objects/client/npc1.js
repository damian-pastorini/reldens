/**
 *
 * Reldens - Npc1
 *
 * Custom animation object sample.
 *
 */

const { AnimationEngine } = require('reldens/packages/objects/client/animation-engine');

class Npc1 extends AnimationEngine
{

    constructor(gameManager, props, currentPreloader)
    {
        // @TODO - BETA - Apply some example customization like secondary custom animation.
        super(gameManager, props, currentPreloader);
    }

}

module.exports.Npc1 = Npc1;
