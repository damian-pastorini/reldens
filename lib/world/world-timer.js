/**
 *
 * Reldens - WorldTimer
 *
 */

const { ErrorManager, sc } = require('@reldens/utils');

class WorldTimer
{

    constructor(props)
    {
        this.world = props.world;
        this.clockInstance = sc.get(props, 'clockInstance', false);
        this.callbacks = sc.get(props, 'callbacks', []);
        this.worldTimer = {};
        this.paused = false;
        this.lastCallTime = 0;
        this.stepTime = 0;
        this.startedTime = (new Date()).getTime();
        this.currentTime = this.startedTime;
        this.validateProperties();
    }

    validateProperties()
    {
        if(!this.world){
            ErrorManager.error('Missing world parameter.');
        }
    }

    startWorldSteps()
    {
        this.stepTime = 1000 * this.world.timeStep;
        if(this.clockInstance){
            this.worldTimer = this.clockInstance.setInterval(() => {
                this.setIntervalCallback();
            }, this.stepTime);
            return;
        }
        this.worldTimer = setInterval(() => {
            this.setIntervalCallback();
        }, this.stepTime);
    }

    setIntervalCallback()
    {
        if(this.paused){
            return;
        }
        this.currentTime += this.stepTime;
        this.stepWorld();
        this.executeCallbacks();
    }

    stepWorld()
    {
        if(this.world.useFixedWorldStep){
            this.world.step(this.world.timeStep);
            return;
        }
        this.stepWorldWithSubSteps();
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

    stepWorldWithSubSteps()
    {
        let now = Date.now() / 1000;
        let timeSinceLastCall = now - this.lastCallTime;
        this.world.step(this.world.timeStep, timeSinceLastCall, this.world.maxSubSteps);
    }

}

module.exports.WorldTimer = WorldTimer;