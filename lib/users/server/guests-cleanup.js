/**
 *
 * Reldens - GuestsCleanup
 *
 * Periodically removes the guest accounts that were not used for the configured time, skipping the ones with an
 * active session and the ones whose player owns a clan.
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
        let staleGuests = await this.usersManager.loadGuestsOlderThan(
            this.guestRoleId,
            Date.now() - this.cleanupAfterMs
        );
        let deletedGuests = 0;
        for(let staleGuest of staleGuests){
            if(this.hasActiveSession(staleGuest.id)){
                continue;
            }
            if(await this.usersManager.deleteGuestUser(staleGuest)){
                deletedGuests++;
            }
        }
        if(0 < deletedGuests){
            Logger.info('Guests cleanup removed '+deletedGuests+' stale guest accounts.');
        }
        return deletedGuests;
    }

    /**
     * @param {number} userId
     * @returns {boolean}
     */
    hasActiveSession(userId)
    {
        if(!this.activePlayers){
            return false;
        }
        return Boolean(sc.get(this.activePlayers.playersSessionsByUserId, userId, false));
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
