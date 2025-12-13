/**
 *
 * Reldens - WorldTimer
 *
 * Manages the physics world step timing and callback execution for the game loop.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} WorldTimerProps
 * @property {Object} [clockInstance]
 * @property {Array<function(): void>} [callbacks]
 */
class WorldTimer
{

    /**
     * @param {WorldTimerProps} props
     */
    constructor(props)
    {
        /** @type {Object|boolean} */
        this.clockInstance = sc.get(props, 'clockInstance', false);
        /** @type {Array<function(): void>} */
        this.callbacks = sc.get(props, 'callbacks', []);
        /** @type {Object} */
        this.worldTimer = {};
        /** @type {boolean} */
        this.paused = false;
        /** @type {number} */
        this.lastCallTime = 0;
        /** @type {number} */
        this.stepTime = 0;
        /** @type {number} */
        this.startedTime = (new Date()).getTime();
        /** @type {number} */
        this.currentTime = this.startedTime;
    }

    /**
     * @param {Object} world
     * @returns {void}
     */
    startWorldSteps(world)
    {
        if(!world){
            Logger.error('World instance invalid.', {world});
            return;
        }
        this.stepTime = 1000 * world.timeStep;
        if(this.clockInstance){
            //Logger.debug('WorldTimes using clock instance.');
            this.worldTimer = this.clockInstance.setInterval(() => {
                this.setIntervalCallback(world);
            }, this.stepTime);
            return;
        }
        //Logger.debug('WorldTimes using setInterval.');
        this.worldTimer = setInterval(() => {
            this.setIntervalCallback(world);
        }, this.stepTime);
    }

    /**
     * @param {Object} world
     * @returns {void}
     */
    setIntervalCallback(world)
    {
        if(this.paused){
            return;
        }
        this.currentTime += this.stepTime;
        this.stepWorld(world);
        this.executeCallbacks();
    }

    /**
     * @param {Object} world
     * @returns {void}
     */
    stepWorld(world)
    {
        if(world.useFixedWorldStep){
            world.step(world.timeStep);
            return;
        }
        this.stepWorldWithSubSteps(world);
    }

    executeCallbacks()
    {
        if(0 === this.callbacks.length){
            return;
        }
        for(let callback of this.callbacks){
            callback();
        }
    }

    /**
     * @param {Object} world
     * @returns {void}
     */
    stepWorldWithSubSteps(world)
    {
        let now = Date.now() / 1000;
        let timeSinceLastCall = now - this.lastCallTime;
        world.step(world.timeStep, timeSinceLastCall, world.maxSubSteps);
    }

}

module.exports.WorldTimer = WorldTimer;
