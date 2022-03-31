/**
 *
 * Reldens - Npc1
 *
 * Custom animation object sample.
 *
 */

const { AnimationEngine } = require('reldens/lib/objects/client/animation-engine');

class Npc1 extends AnimationEngine
{

    constructor(gameManager, props, currentPreloader)
    {
        // @TODO - BETA - This is an example of client side customizations.
        super(gameManager, props, currentPreloader);
    }

}

module.exports.Npc1 = Npc1;
