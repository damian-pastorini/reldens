/**
 *
 * Reldens - GeneratorsRoutesSubscriber
 *
 * Subscriber that sets up static file routes in the admin panel for generated and source data.
 * Provides authenticated access to the generate-data and generated directories.
 *
 */

const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 */
class GeneratorsRoutesSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {string} projectGenerateDataPath
     * @param {string} projectGeneratedDataPath
     */
    constructor(adminManager, projectGenerateDataPath, projectGeneratedDataPath)
    {
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {string} */
        this.projectGenerateDataPath = projectGenerateDataPath;
        /** @type {string} */
        this.projectGeneratedDataPath = projectGeneratedDataPath;
        this.listenEvents();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on GeneratorsRoutesSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', async (event) => {
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
            Logger.error('AdminRouter is not available in GeneratorsRoutesSubscriber.setupRoutes.');
            return false;
        }
        adminManager.router.adminRouter.use(
            '/generate-data',
            this.isAuthenticated.bind(this),
            adminManager.applicationFramework.static(this.projectGenerateDataPath)
        );
        adminManager.router.adminRouter.use(
            '/generated',
            this.isAuthenticated.bind(this),
            adminManager.applicationFramework.static(this.projectGeneratedDataPath)
        );
        Logger.info(
            'Included administration panel static routes.',
            this.projectGenerateDataPath,
            this.projectGeneratedDataPath
        );
    }

}

module.exports.GeneratorsRoutesSubscriber = GeneratorsRoutesSubscriber;
