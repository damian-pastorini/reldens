/**
 *
 * Reldens - ShutdownManager
 *
 */

const { Logger, sc } = require('@reldens/utils');

class ShutdownManager
{

    constructor(adminManager)
    {
        this.managementPath = '/management';
        this.rootPath = '';
        this.events = adminManager.events;
        this.config = adminManager.config;
        this.render = adminManager.render.bind(adminManager);
        this.renderRoute = adminManager.renderRoute.bind(adminManager);
        this.isAuthenticated = adminManager.isAuthenticated.bind(adminManager);
        this.broadcastCallback = null;
        this.translations = null;
        this.defaultShutdownTime = 180;
        this.shutdownTime = 0;
        this.shuttingDownIn = 0;
        this.shutdownInterval = null;
        this.shutdownTimeout = null;
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on ShutdownManager.');
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
                    shutdownTime: this.config.getWithoutLogs('server/shutdownTime', 180),
                    shuttingDownLabel: '{{&shuttingDownLabel}}',
                    shuttingDownTime: '{{&shuttingDownTime}}',
                    submitLabel: '{{&submitLabel}}',
                    submitType: '{{&submitType}}'
                }
            );
            event.adminManager.adminContents.management = await this.renderRoute(
                pageContent,
                event.adminManager.adminContents.sideBar
            );
        });

    }

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
        if(!adminManager.adminRouter){
            Logger.error('AdminRouter is not available in ShutdownManager.setupRoutes');
            return false;
        }
        adminManager.adminRouter.get(this.managementPath, this.isAuthenticated, async (req, res) => {
            let rendererContent = await this.render(adminManager.adminContents.management, this.getShuttingDownData());
            return res.send(rendererContent);
        });
        adminManager.adminRouter.post(this.managementPath, this.isAuthenticated, async (req, res) => {
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
                    if(adminManager.broadcastCallback && sc.isFunction(adminManager.broadcastCallback)){
                        await adminManager.broadcastCallback({message: 'Server Offline.'});
                    }
                    throw new Error('Server shutdown by request on the administration panel.');
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

    getShuttingDownData()
    {
        let shutdownTime = this.defaultShutdownTime;
        if(this.config && typeof this.config.getWithoutLogs === 'function'){
            shutdownTime = this.config.getWithoutLogs('server/shutdownTime', this.defaultShutdownTime);
        }
        if(0 === this.shuttingDownIn){
            return {
                shuttingDownLabel: '',
                shuttingDownTime: '',
                submitLabel: this.translations.labels.submitShutdownLabel || 'Shutdown Server',
                submitType: 'danger',
                shutdownTime: shutdownTime
            };
        }
        return {
            shuttingDownLabel: this.translations.labels.shuttingDown || '',
            shuttingDownTime: this.shuttingDownIn || '',
            submitLabel: this.translations.labels.submitCancelLabel || 'Cancel Server Shutdown',
            submitType: 'warning',
            shutdownTime: shutdownTime
        };
    }

    async broadcastShutdownMessage()
    {
        let shuttingDownTime = 0 === this.shuttingDownIn ? this.shutdownTime : this.shuttingDownIn;
        await this.broadcastSystemMessage('Server is shutting down in ' + shuttingDownTime + ' seconds.');
    }

    async broadcastSystemMessage(message)
    {
        if(!this.broadcastCallback || !sc.isFunction(this.broadcastCallback)){
            return;
        }
        await this.broadcastCallback({message});
    }

}

module.exports.ShutdownManager = ShutdownManager;
