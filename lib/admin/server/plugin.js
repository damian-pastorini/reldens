/**
 *
 * Reldens - AdminPlugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { SetupServerProperties } = require('../../features/server/setup-server-properties');
const { CreateAdminSubscriber } = require('./subscribers/create-admin-subscriber');
const { MapsWizardSubscriber } = require('./subscribers/maps-wizard-subscriber');
const { ObjectsImporterSubscriber } = require('./subscribers/objects-importer-subscriber');
const { SkillsImporterSubscriber } = require('./subscribers/skills-importer-subscriber');
const { ShutdownSubscriber } = require('./subscribers/shutdown-subscriber');
const { RoomsEntitySubscriber } = require('./subscribers/rooms-entity-subscriber');
const { GeneratorsRoutesSubscriber } = require('./subscribers/generators-routes-subscriber');
const { Logger } = require('@reldens/utils');

class AdminPlugin extends PluginInterface
{

    setup(setupServerProperties)
    {
        if(!(setupServerProperties instanceof SetupServerProperties)){
            Logger.error('The setupServerProperties param must be an instance of SetupServerProperties.');
            return false;
        }
        if(!setupServerProperties.validate()){
            return false;
        }
        setupServerProperties.assignProperties(this);
        this.createAdminSubscriber = new CreateAdminSubscriber();
        this.subscribers = {};
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return;
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            await this.createAdminSubscriber.activateAdmin(event);
        });
        this.events.on('reldens.beforeSetupAdminManager', async (event) => {
            let adminManager = event.serverManager.serverAdmin;
            if(!adminManager){
                Logger.error('The admin manager does not exist to setup the AdminPlugin on beforeSetupAdminManager.');
                return false;
            }
            let themeManager = event.serverManager.themeManager;
            this.subscribers.shutdown = new ShutdownSubscriber(
                adminManager,
                this.config,
                event.serverManager.serverBroadcast.bind(event.serverManager)
            );
            this.subscribers.mapsWizard = new MapsWizardSubscriber(adminManager, this.config, themeManager);
            this.subscribers.objectsImporter = new ObjectsImporterSubscriber(adminManager, themeManager);
            this.subscribers.skillsImporter = new SkillsImporterSubscriber(adminManager, themeManager);
            this.subscribers.roomsEntity = new RoomsEntitySubscriber(adminManager);
            this.subscribers.generatorsRoutes = new GeneratorsRoutesSubscriber(
                adminManager,
                themeManager.projectGenerateDataPath,
                themeManager.projectGeneratedDataPath
            );
        });
    }
}

module.exports.AdminPlugin = AdminPlugin;
