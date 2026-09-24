/**
 *
 * Reldens - IpListsEntitySubscriber
 *
 * Refreshes the active address allow and deny lists when an ip_lists row is saved or deleted in the administration
 * panel, so the HTTP and WebSocket checks apply the change without a restart.
 *
 */

const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../game/server/ip-lists-upgrade-guard').IpListsUpgradeGuard} IpListsUpgradeGuard
 */
class IpListsEntitySubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {IpListsUpgradeGuard|boolean} ipListsUpgradeGuard
     */
    constructor(adminManager, ipListsUpgradeGuard)
    {
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {IpListsUpgradeGuard|boolean} */
        this.ipListsUpgradeGuard = ipListsUpgradeGuard;
        /** @type {string} */
        this.entityKey = 'ipLists';
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager is not defined for IpListsEntitySubscriber.');
            return false;
        }
        if(!this.ipListsUpgradeGuard){
            Logger.error('IpListsUpgradeGuard is not defined for IpListsEntitySubscriber.');
            return false;
        }
        this.events.on('reldens.adminAfterEntitySave', async (event) => {
            await this.refreshIpLists(event);
        });
        this.events.on('reldens.adminAfterEntityDelete', async (event) => {
            await this.refreshIpLists(event);
        });
        return true;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async refreshIpLists(event)
    {
        if(this.entityKey !== event.driverResource?.entityKey){
            return false;
        }
        try {
            await this.ipListsUpgradeGuard.refresh();
            return true;
        } catch (error) {
            Logger.error('The IP lists could not be refreshed after the admin change: '+error.message);
            return false;
        }
    }

}

module.exports.IpListsEntitySubscriber = IpListsEntitySubscriber;
