/**
 *
 * Reldens - RoomsActivePlayersSubscriber
 *
 * Renders the logged players banner on the rooms view page and exposes the authenticated endpoint the page
 * scripts poll to keep that count up to date without reloading.
 *
 */

const { RoomsActivePlayersWarning } = require('../rooms-active-players-warning');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../rooms/server/manager').RoomsManager} RoomsManager
 * @typedef {import('../../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 */
class RoomsActivePlayersSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ConfigManager} config
     * @param {RoomsManager} roomsManager
     */
    constructor(adminManager, config, roomsManager)
    {
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {RoomsActivePlayersWarning} */
        this.activePlayersWarning = new RoomsActivePlayersWarning({
            roomsManager,
            config,
            renderCallback: adminManager.renderCallback,
            templateContent: sc.get(adminManager.adminFilesContents, 'roomsActivePlayers', '')
        });
        /** @type {string} */
        this.routePath = '/rooms/active-players';
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on RoomsActivePlayersSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', (event) => {
            this.setupRoutes(event.adminManager);
        });
        this.events.on('reldens.adminViewPropertiesPopulation', async (event) => {
            if('rooms' !== event.driverResource?.id()){
                return;
            }
            await this.activePlayersWarning.appendTo(event.renderedViewProperties);
        });
        this.events.on('reldens.adminListPropertiesPopulation', (event) => {
            if('rooms' !== event.driverResource?.id()){
                return;
            }
            this.activePlayersWarning.appendDefaultRoomFlagTo(event.listProperties);
        });
    }

    /**
     * @param {AdminManager} adminManager
     * @returns {boolean|void}
     */
    setupRoutes(adminManager)
    {
        if(!adminManager.router.adminRouter){
            Logger.error('AdminRouter not available in RoomsActivePlayersSubscriber.');
            return false;
        }
        adminManager.router.adminRouter.get(
            this.routePath,
            this.isAuthenticated,
            (req, res) => res.json({count: this.activePlayersWarning.countRoomPlayers(sc.get(req.query, 'id', 0))})
        );
    }

}

module.exports.RoomsActivePlayersSubscriber = RoomsActivePlayersSubscriber;
