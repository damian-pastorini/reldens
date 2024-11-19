/**
 *
 * Reldens - WorldTimer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class WorldTimer
{

    constructor(props)
    {
        this.clockInstance = sc.get(props, 'clockInstance', false);
        this.callbacks = sc.get(props, 'callbacks', []);
        this.worldTimer = {};
        this.paused = false;
        this.lastCallTime = 0;
        this.stepTime = 0;
        this.startedTime = (new Date()).getTime();
        this.currentTime = this.startedTime;
    }

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

    setIntervalCallback(world)
    {
        if(this.paused){
            return;
        }
        this.currentTime += this.stepTime;
        this.stepWorld(world);
        this.executeCallbacks();
    }

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

    stepWorldWithSubSteps(world)
    {
        let now = Date.now() / 1000;
        let timeSinceLastCall = now - this.lastCallTime;
        world.step(world.timeStep, timeSinceLastCall, world.maxSubSteps);
    }

}

module.exports.WorldTimer = WorldTimer;
