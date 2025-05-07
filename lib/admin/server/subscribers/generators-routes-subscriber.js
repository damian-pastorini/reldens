/**
 *
 * Reldens - GeneratorsRoutesSubscriber
 *
 */

const { Logger } = require('@reldens/utils');

class GeneratorsRoutesSubscriber
{

    constructor(adminManager, projectGenerateDataPath, projectGeneratedDataPath)
    {
        this.events = adminManager.events;
        this.isAuthenticated = adminManager.isAuthenticated.bind(adminManager);
        this.projectGenerateDataPath = projectGenerateDataPath;
        this.projectGeneratedDataPath = projectGeneratedDataPath;
        this.listenEvents();
    }

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

    setupRoutes(adminManager)
    {
        if(!adminManager.adminRouter){
            Logger.error('AdminRouter is not available in GeneratorsRoutesSubscriber.setupRoutes.');
            return false;
        }
        adminManager.adminRouter.use(
            '/generate-data',
            this.isAuthenticated.bind(this),
            adminManager.applicationFramework.static(this.projectGenerateDataPath)
        );
        adminManager.adminRouter.use(
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
