/**
 *
 * Reldens - BattleTurnTimers
 *
 * Keeps one pending battle turn per player, a new turn replaces the pending one and a failed turn is logged.
 *
 */

const { Logger } = require('@reldens/utils');

class BattleTurnTimers
{

    constructor()
    {
        /** @type {Object<string, NodeJS.Timeout>} */
        this.timers = {};
    }

    /**
     * @param {number} playerId
     * @param {number} delay
     * @param {function(): Promise<boolean>} turnCallback
     * @returns {boolean}
     */
    scheduleWhenFree(playerId, delay, turnCallback)
    {
        if(this.timers[playerId]){
            return false;
        }
        return this.schedule(playerId, delay, turnCallback);
    }

    /**
     * @param {number} playerId
     * @param {number} delay
     * @param {function(): Promise<boolean>} turnCallback
     * @returns {boolean}
     */
    schedule(playerId, delay, turnCallback)
    {
        this.clear(playerId);
        this.timers[playerId] = setTimeout(async () => {
            delete this.timers[playerId];
            try {
                await turnCallback();
            } catch (error) {
                Logger.error('Battle turn error.', playerId, error.message);
            }
        }, delay);
        return true;
    }

    /**
     * @param {number} playerId
     * @returns {boolean}
     */
    clear(playerId)
    {
        clearTimeout(this.timers[playerId]);
        delete this.timers[playerId];
        return true;
    }

}

module.exports.BattleTurnTimers = BattleTurnTimers;
