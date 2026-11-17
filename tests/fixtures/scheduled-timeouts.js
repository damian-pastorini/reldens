/**
 *
 * Reldens - ScheduledTimeouts
 *
 * Captures the setTimeout and setInterval calls made while a callback runs, instead of starting them, and runs the
 * captured timeouts on demand in their scheduled order (the timeouts a run callback schedules while the capture is
 * still active run in the same call), so a test controls when every delayed step happens and reads the delays used;
 * the captured intervals are kept for the test to call each tick.
 *
 */

class ScheduledTimeouts
{

    constructor()
    {
        /** @type {Array<{timeoutCallback: Function, delayMs: number}>} */
        this.scheduledTimeouts = [];
        /** @type {Array<{intervalCallback: Function, delayMs: number}>} */
        this.scheduledIntervals = [];
    }

    /**
     * @param {Function} callback
     * @returns {Promise<*>}
     */
    async capture(callback)
    {
        let originalSetTimeout = global.setTimeout;
        let originalSetInterval = global.setInterval;
        global.setTimeout = (timeoutCallback, delayMs) => this.scheduledTimeouts.push({timeoutCallback, delayMs});
        global.setInterval = (intervalCallback, delayMs) => this.scheduledIntervals.push({intervalCallback, delayMs});
        let callbackResult = false;
        let callbackError = false;
        try {
            callbackResult = await callback();
        } catch(error) {
            callbackError = error;
        }
        global.setTimeout = originalSetTimeout;
        global.setInterval = originalSetInterval;
        if(callbackError){
            throw callbackError;
        }
        return callbackResult;
    }

    /**
     * @returns {Array<number>}
     */
    runAll()
    {
        let delays = [];
        for(let i = 0; i < this.scheduledTimeouts.length; i++){
            delays.push(this.scheduledTimeouts[i].delayMs);
            this.scheduledTimeouts[i].timeoutCallback();
        }
        this.scheduledTimeouts = [];
        return delays;
    }

}

module.exports.ScheduledTimeouts = ScheduledTimeouts;
