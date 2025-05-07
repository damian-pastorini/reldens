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
const { SkillsImporterManager } = require('./skills-importer-manager');
const { ShutdownManager } = require('./shutdown-manager');
const { RoomsEntitySubscriber } = require('./subscribers/rooms-entity-subscriber');
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
        this.managers = {};
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
            this.managers.shutdown = new ShutdownManager(adminManager);
            this.managers.mapsWizard = new MapsWizardSubscriber(adminManager, this.config);
            this.managers.objectsImporter = new ObjectsImporterSubscriber(adminManager);
            this.managers.skillsImporter = new SkillsImporterManager(adminManager);
            this.managers.roomsEntity = new RoomsEntitySubscriber(adminManager);
        });
    }
}

module.exports.AdminPlugin = AdminPlugin;
