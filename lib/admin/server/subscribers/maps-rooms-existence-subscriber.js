/**
 *
 * Reldens - MapsRoomsExistenceSubscriber
 *
 * Exposes a read-only admin endpoint used by the maps wizard to check whether a room already
 * exists for one or more manually entered map names, so the generation confirmation can warn
 * before overriding an existing map.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 */
class MapsRoomsExistenceSubscriber
{

    /**
     * @param {AdminManager} adminManager
     */
    constructor(adminManager)
    {
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {Object} */
        this.dataServer = adminManager.dataServer;
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {string} */
        this.routePath = '/maps-wizard/api/rooms-exist';
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on MapsRoomsExistenceSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', (event) => {
            this.setupRoutes(event.adminManager);
        });
    }

    /**
     * @param {AdminManager} adminManager
     * @returns {boolean|void}
     */
    setupRoutes(adminManager)
    {
        if(!adminManager.router.adminRouter){
            Logger.error('AdminRouter not available in MapsRoomsExistenceSubscriber.');
            return false;
        }
        adminManager.router.adminRouter.get(
            this.routePath,
            this.isAuthenticated,
            async (req, res) => this.handleRoomsExist(req, res)
        );
    }

    /**
     * @param {ExpressRequest} req
     * @param {ExpressResponse} res
     * @returns {Promise<e.Response<any, Record<string, any>>>}
     */
    async handleRoomsExist(req, res)
    {
        let requested = this.parseRequestedNames(sc.get(req.query, 'names', ''));
        if(0 === requested.length){
            return res.json({existing: []});
        }
        let roomsRepository = this.dataServer.getEntity('rooms');
        let existing = [];
        for(let name of requested){
            let found = await roomsRepository.loadOneBy('name', name);
            if(found){
                existing.push(name);
            }
        }
        return res.json({existing});
    }

    /**
     * @param {string} raw
     * @returns {Array<string>}
     */
    parseRequestedNames(raw)
    {
        let result = [];
        for(let part of raw.split(',')){
            let name = part.trim();
            if(name){
                result.push(name);
            }
        }
        return result;
    }

}

module.exports.MapsRoomsExistenceSubscriber = MapsRoomsExistenceSubscriber;
