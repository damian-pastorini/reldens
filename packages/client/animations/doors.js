
const AnimationEngine = require('../../../src/objects/animation-engine');

class DoorsAnimation extends AnimationEngine
{

    constructor(gameManager, props = false)
    {
        let defaultConfig = {
            enabled: true,
            animationKey: props.animationKey,
            animationSprite: props.animationKey,
            frameStart: 0,
            frameEnd: 4,
            repeat: 0,
            hideOnComplete: true
        };
        super(gameManager, (props || defaultConfig));
    }

}

module.exports = DoorsAnimation;
