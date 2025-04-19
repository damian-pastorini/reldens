/**
 *
 * Reldens - AdminPlugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { SetupServerProperties } = require('../../features/server/setup-server-properties');
const { ActivateAdminSubscriber } = require('./subscribers/activate-admin-subscriber');
const { MapsWizardManager } = require('./maps-wizard-manager');
const { ObjectsImporterManager } = require('./objects-importer-manager');
const { SkillsImporterManager } = require('./skills-importer-manager');
const { ShutdownManager } = require('./shutdown-manager');
const { RoomsEntityManager } = require('./rooms-entity-manager');
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
        this.activateAdminSubscriber = new ActivateAdminSubscriber();
        this.managers = {};
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return;
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            await this.activateAdminSubscriber.activateAdmin(event);
        });
        this.events.on('reldens.beforeSetupAdminManager', async (event) => {
            let adminManager = event.serverManager.serverAdmin;
            if(!adminManager){
                Logger.error('The admin manager does not exist to setup the AdminPlugin on beforeSetupAdminManager.');
                return false;
            }
            this.managers.shutdown = new ShutdownManager(adminManager);
            this.managers.mapsWizard = new MapsWizardManager(adminManager);
            this.managers.objectsImporter = new ObjectsImporterManager(adminManager);
            this.managers.skillsImporter = new SkillsImporterManager(adminManager);
            this.managers.roomsEntity = new RoomsEntityManager(adminManager);
        });
    }
}

module.exports.AdminPlugin = AdminPlugin;
