/**
 *
 * Reldens - GuestsCleanup
 *
 * Periodically removes the guest accounts that were not used for the configured time, skipping the ones with an
 * active session and the ones whose player owns a clan. The guests active on this server are touched first so other
 * servers do not remove them, the runs never overlap and every deletion first claims the guest row.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./manager').UsersManager} UsersManager
 */
class GuestsCleanup
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {UsersManager} */
        this.usersManager = sc.get(props, 'usersManager', false);
        /** @type {Object} */
        this.activePlayers = sc.get(props, 'activePlayers', false);
        /** @type {Object} */
        this.config = sc.get(props, 'config', false);
        /** @type {Object|boolean} */
        this.intervalTimer = false;
        /** @type {boolean} */
        this.isRunning = false;
        /** @type {number} */
        this.guestRoleId = Number(this.config?.getWithoutLogs('server/players/guestUser/roleId', 0));
        /** @type {boolean} */
        this.enabled = Boolean(this.config?.getWithoutLogs(
            'server/players/guestUser/cleanupEnabled',
            sc.get(props, 'cleanupEnabled', false)
        ));
        /** @type {number} */
        this.cleanupAfterMs = Number(this.config?.getWithoutLogs(
            'server/players/guestUser/cleanupAfterMs',
            sc.get(props, 'cleanupAfterMs', 604800000)
        ));
        /** @type {number} */
        this.cleanupIntervalMs = Number(this.config?.getWithoutLogs(
            'server/players/guestUser/cleanupIntervalMs',
            sc.get(props, 'cleanupIntervalMs', 3600000)
        ));
    }

    /**
     * @returns {boolean}
     */
    start()
    {
        if(!this.enabled){
            return false;
        }
        if(!this.usersManager){
            Logger.error('The guests cleanup can not run without the users manager.');
            return false;
        }
        if(0 === this.guestRoleId){
            Logger.warning('The guests cleanup is disabled, the guest role ID is not defined.');
            return false;
        }
        if(this.cleanupIntervalMs >= this.cleanupAfterMs){
            Logger.warning('The guests cleanup is disabled, the interval must be lower than the cleanup after time.');
            return false;
        }
        this.intervalTimer = setInterval(() => {
            this.runCleanup().catch((error) => Logger.error('Guests cleanup error: '+error.message));
        }, this.cleanupIntervalMs);
        this.intervalTimer.unref();
        return true;
    }

    /**
     * @returns {Promise<number>}
     */
    async runCleanup()
    {
        if(this.isRunning){
            return 0;
        }
        this.isRunning = true;
        try {
            return await this.removeStaleGuests(Date.now() - this.cleanupAfterMs);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * @param {number} olderThanTime
     * @returns {Promise<number>}
     */
    async removeStaleGuests(olderThanTime)
    {
        await this.usersManager.touchGuests(this.guestRoleId, this.localActiveUserIds());
        let staleGuests = await this.usersManager.loadGuestsOlderThan(this.guestRoleId, olderThanTime);
        let deletedGuests = 0;
        for(let staleGuest of staleGuests){
            if(this.hasActiveSession(staleGuest.id)){
                continue;
            }
            if(await this.usersManager.deleteGuestUser(staleGuest, olderThanTime)){
                deletedGuests++;
            }
        }
        if(0 < deletedGuests){
            Logger.info('Guests cleanup removed '+deletedGuests+' stale guest accounts.');
        }
        return deletedGuests;
    }

    /**
     * @returns {Array<number>}
     */
    localActiveUserIds()
    {
        if(!this.activePlayers){
            return [];
        }
        let activeUserIds = [];
        for(let userId of Object.keys(sc.get(this.activePlayers, 'playersSessionsByUserId', {}))){
            if(this.hasActiveSession(userId)){
                activeUserIds.push(Number(userId));
            }
        }
        return activeUserIds;
    }

    /**
     * @param {number|string} userId
     * @returns {boolean}
     */
    hasActiveSession(userId)
    {
        if(!this.activePlayers){
            return false;
        }
        return 0 < Object.keys(sc.get(this.activePlayers.playersSessionsByUserId, userId, {})).length;
    }

    /**
     * @returns {boolean}
     */
    stop()
    {
        if(!this.intervalTimer){
            return false;
        }
        clearInterval(this.intervalTimer);
        this.intervalTimer = false;
        return true;
    }

}

module.exports.GuestsCleanup = GuestsCleanup;
