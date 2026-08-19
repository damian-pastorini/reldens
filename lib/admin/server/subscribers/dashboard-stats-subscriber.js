/**
 *
 * Reldens - DashboardStatsSubscriber
 *
 * Exposes an authenticated admin endpoint with the dashboard activity stats: the currently logged users
 * count and the distinct logged users per day over the last 30 days.
 *
 */

const { UsersActivityDataProvider } = require('../users-activity-data-provider');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../game/server/memory/active-players')} ActivePlayers
 * @typedef {import('express').Response} ExpressResponse
 */
class DashboardStatsSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ActivePlayers|boolean} activePlayers
     */
    constructor(adminManager, activePlayers)
    {
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {UsersActivityDataProvider} */
        this.usersActivityDataProvider = new UsersActivityDataProvider(adminManager.dataServer, activePlayers);
        /** @type {string} */
        this.routePath = '/dashboard/stats';
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on DashboardStatsSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', (event) => this.setupRoutes(event.adminManager));
        return true;
    }

    /**
     * @param {AdminManager} adminManager
     * @returns {boolean|void}
     */
    setupRoutes(adminManager)
    {
        if(!adminManager.router.adminRouter){
            Logger.error('AdminRouter not available in DashboardStatsSubscriber.');
            return false;
        }
        adminManager.router.adminRouter.get(
            this.routePath,
            this.isAuthenticated,
            async (req, res) => this.sendStats(res)
        );
    }

    /**
     * @param {ExpressResponse} res
     * @returns {Promise<Object>}
     */
    async sendStats(res)
    {
        try {
            return res.json(await this.usersActivityDataProvider.fetchStats());
        } catch (error) {
            Logger.error('Dashboard stats could not be fetched. '+error.message);
            return res.json({error: true});
        }
    }

}

module.exports.DashboardStatsSubscriber = DashboardStatsSubscriber;
