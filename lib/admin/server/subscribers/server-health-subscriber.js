/**
 *
 * Reldens - ServerHealthSubscriber
 *
 * Shows the servers usage in the administration panel: fills the server usage block into the dashboard and the
 * control panel (management) templates before the admin contents are built, and exposes an authenticated route with
 * the status of this server and of every other server of the rooms (RoomsAvailability), with the response time and
 * the reachable state of each one, which the block requests on an interval.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../game/server/health/rooms-availability').RoomsAvailability} RoomsAvailability
 * @typedef {import('express').Response} ExpressResponse
 */
class ServerHealthSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {RoomsAvailability|boolean} roomsAvailability
     */
    constructor(adminManager, roomsAvailability)
    {
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {RoomsAvailability|boolean} */
        this.roomsAvailability = roomsAvailability;
        /** @type {string} */
        this.routePath = '/server-health/usage';
        /** @type {string} */
        this.serverUsagePlaceholder = '{{&serverUsage}}';
        /** @type {Array<string>} */
        this.serverUsagePages = ['dashboard', 'management'];
        this.injectServerUsageIntoPages(adminManager.adminFilesContents);
        this.listenEvents();
    }

    /**
     * @param {Object<string, any>} adminFilesContents
     * @returns {boolean}
     */
    injectServerUsageIntoPages(adminFilesContents)
    {
        let serverUsage = sc.get(adminFilesContents, 'serverUsage', '');
        if(!serverUsage){
            Logger.error('Server usage admin template not found.');
            return false;
        }
        for(let pageKey of this.serverUsagePages){
            adminFilesContents[pageKey] = sc.get(adminFilesContents, pageKey, '').replaceAll(
                this.serverUsagePlaceholder,
                serverUsage
            );
        }
        return true;
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on ServerHealthSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', (event) => this.setupRoute(event.adminManager.router.adminRouter));
        return true;
    }

    /**
     * @param {import('express').Router} adminRouter
     * @returns {boolean}
     */
    setupRoute(adminRouter)
    {
        if(!adminRouter){
            Logger.error('AdminRouter not available in ServerHealthSubscriber.');
            return false;
        }
        adminRouter.get(this.routePath, this.isAuthenticated, async (req, res) => await this.sendServersStatuses(res));
        return true;
    }

    /**
     * @param {ExpressResponse} res
     * @returns {Promise<Object>}
     */
    async sendServersStatuses(res)
    {
        if(!this.roomsAvailability){
            Logger.error('RoomsAvailability not available in ServerHealthSubscriber.');
            return res.json({error: true});
        }
        return res.json({servers: await this.roomsAvailability.fetchServersStatuses()});
    }

}

module.exports.ServerHealthSubscriber = ServerHealthSubscriber;
