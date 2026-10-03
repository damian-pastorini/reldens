/**
 *
 * Reldens - ShutdownSubscriber
 *
 * Subscriber that provides server shutdown functionality through the admin panel.
 * Allows administrators to schedule server shutdown with countdown and cancellation support.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../config/server/manager').ConfigManager} ConfigManager
 */
class ShutdownSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ConfigManager} configManager
     * @param {Function} broadcastCallback
     */
    constructor(adminManager, configManager, broadcastCallback)
    {
        /** @type {string} */
        this.managementPath = '/management';
        /** @type {string} */
        this.rootPath = '';
        /** @type {Function} */
        this.broadcastCallback = broadcastCallback;
        /** @type {Object|null} */
        this.translations = null;
        /** @type {number} */
        this.defaultShutdownTime = 180;
        /** @type {number} */
        this.shutdownTime = 0;
        /** @type {number} */
        this.shuttingDownIn = 0;
        /** @type {NodeJS.Timeout|null} */
        this.shutdownInterval = null;
        /** @type {NodeJS.Timeout|null} */
        this.shutdownTimeout = null;
        /** @type {ConfigManager} */
        this.config = configManager;
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {Function} */
        this.render = adminManager.contentsBuilder.render.bind(adminManager.contentsBuilder);
        /** @type {Function} */
        this.renderRoute = adminManager.contentsBuilder.renderRoute.bind(adminManager.contentsBuilder);
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        this.listenEvents();
        this.fetchConfigurations();
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on ShutdownSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', async (event) => {
            this.setupRoutes(event.adminManager);
        });
        this.events.on('reldens.adminSideBarBeforeSubItems', async (event) => {
            event.navigationContents['Server'] = {'Management': await this.render(
                event.adminManager.adminFilesContents.sideBarItem,
                {
                    name: event.adminManager.translations.labels['management'],
                    path: event.adminManager.rootPath+this.managementPath
                }
            )};
        });
        this.events.on('reldens.buildAdminContentsAfter', async (event) => {
            let pageContent = await this.render(
                event.adminManager.adminFilesContents.management,
                {
                    actionPath: event.adminManager.rootPath+this.managementPath,
                    shutdownTime: this.config.getWithoutLogs('server/shutdownTime', this.defaultShutdownTime),
                    shuttingDownLabel: '{{&shuttingDownLabel}}',
                    shuttingDownTime: '{{&shuttingDownTime}}',
                    submitLabel: '{{&submitLabel}}',
                    submitType: '{{&submitType}}'
                }
            );
            event.adminManager.contentsBuilder.adminContents.management = await this.renderRoute(
                pageContent,
                event.adminManager.contentsBuilder.adminContents.sideBar
            );
        });
    }

    /**
     * @returns {boolean|void}
     */
    fetchConfigurations()
    {
        if(!this.config){
            return false;
        }
        /** @type {number} */
        this.configuredShutdownTime = this.config.getWithoutLogs('server/shutdownTime', this.defaultShutdownTime);
    }

    /**
     * @param {AdminManager} adminManager
     * @returns {boolean|void}
     */
    setupRoutes(adminManager)
    {
        if('' === this.rootPath){
            this.rootPath = adminManager.rootPath;
        }
        if(!this.broadcastCallback){
            this.broadcastCallback = adminManager.broadcastCallback;
        }
        if(!this.translations){
            this.translations = adminManager.translations;
        }
        if(!adminManager.router.adminRouter){
            Logger.error('AdminRouter is not available in ShutdownSubscriber.setupRoutes.');
            return false;
        }
        adminManager.router.adminRouter.get(this.managementPath, this.isAuthenticated, async (req, res) => {
            let rendererContent = await this.render(
                adminManager.contentsBuilder.adminContents.management,
                this.getShuttingDownData()
            );
            return res.send(rendererContent);
        });
        adminManager.router.adminRouter.post(this.managementPath, this.isAuthenticated, async (req, res) => {
            this.shutdownTime = req.body['shutdown-time'];
            let redirectManagementPath = this.rootPath+this.managementPath;
            if(!this.shutdownTime){
                return res.redirect(redirectManagementPath+'?result=shutdownError');
            }
            if(0 < this.shuttingDownIn){
                clearInterval(this.shutdownInterval);
                clearTimeout(this.shutdownTimeout);
                this.shuttingDownIn = 0;
                return res.redirect(redirectManagementPath+'?result=success');
            }
            await this.broadcastShutdownMessage();
            this.shutdownTimeout = setTimeout(
                async () => {
                    Logger.info('Server is shutting down by request on the administration panel.', sc.getTime());
                    if(this.broadcastCallback && sc.isFunction(this.broadcastCallback)){
                        await this.broadcastCallback({message: 'Server Offline.'});
                    }
                    process.exit(0);
                },
                this.shutdownTime * 1000
            );
            this.shutdownInterval = setInterval(
                async () => {
                    this.shuttingDownIn--;
                    Logger.info('Server is shutting down in '+this.shuttingDownIn+' seconds.');
                    if(
                        0 < this.shuttingDownIn
                        && (this.shuttingDownIn <= 5 || Math.ceil(this.shutdownTime / 2) === this.shuttingDownIn)
                    ){
                        await this.broadcastShutdownMessage();
                    }
                    if(0 === this.shuttingDownIn){
                        Logger.info('Server OFF at: '+ sc.getTime());
                        clearInterval(this.shutdownInterval);
                    }
                },
                1000
            );
            this.shuttingDownIn = this.shutdownTime;
            return res.redirect(redirectManagementPath+'?result=success');
        });
    }

    /**
     * @returns {Object}
     */
    getShuttingDownData()
    {
        if(0 === this.shuttingDownIn){
            return {
                shuttingDownLabel: '',
                shuttingDownTime: '',
                submitLabel: this.translations.labels.submitShutdownLabel || 'Shutdown Server',
                submitType: 'danger',
                shutdownTime: this.configuredShutdownTime
            };
        }
        return {
            shuttingDownLabel: this.translations.labels.shuttingDown || '',
            shuttingDownTime: this.shuttingDownIn || '',
            submitLabel: this.translations.labels.submitCancelLabel || 'Cancel Server Shutdown',
            submitType: 'warning',
            shutdownTime: this.configuredShutdownTime
        };
    }

    /**
     * @returns {Promise<void>}
     */
    async broadcastShutdownMessage()
    {
        let shuttingDownTime = 0 === this.shuttingDownIn ? this.shutdownTime : this.shuttingDownIn;
        await this.broadcastSystemMessage('Server is shutting down in ' + shuttingDownTime + ' seconds.');
    }

    /**
     * @param {string} message
     * @returns {Promise<void>}
     */
    async broadcastSystemMessage(message)
    {
        if(!this.broadcastCallback || !sc.isFunction(this.broadcastCallback)){
            Logger.warning('Broadcast callback was not configured in ShutdownSubscriber.', this.broadcastCallback);
            return;
        }
        await this.broadcastCallback({message});
    }

}

module.exports.ShutdownSubscriber = ShutdownSubscriber;
