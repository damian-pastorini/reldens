/**
 *
 * Reldens - AdminPlugin
 *
 * Plugin that sets up the administration panel and related management features including
 * server shutdown, maps wizard, objects importer, skills importer, and rooms management.
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
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../config/server/manager').ConfigManager} ConfigManager
 */
class AdminPlugin extends PluginInterface
{

    /**
     * @param {SetupServerProperties} setupServerProperties
     * @return {Promise<boolean>}
     */
    async setup(setupServerProperties)
    {
        if(!(setupServerProperties instanceof SetupServerProperties)){
            Logger.error('The setupServerProperties param must be an instance of SetupServerProperties.');
            return false;
        }
        if(!setupServerProperties.validate()){
            return false;
        }
        setupServerProperties.assignProperties(this);
        /** @type {CreateAdminSubscriber} */
        this.createAdminSubscriber = new CreateAdminSubscriber();
        /** @type {Object<string, Object>} */
        this.subscribers = {};
        this.listenEvents();
        return true;
    }

    listenEvents()
    {
        if(!this.events){
            return;
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            await this.createAdminSubscriber.activateAdmin(event);
        });
        this.events.on('reldens.beforeCreateAdminManager', async (event) => {
            if(!event.serverManager?.dataServerConfig?.translations){
                Logger.debug('Translations not available on beforeCreateAdminManage event.');
                return;
            }
            sc.deepMergeProperties(event.serverManager.dataServerConfig.translations, {
                messages: {
                    loginWelcome: 'Administration Panel - Login',
                    reldensTitle: 'Reldens - Administration Panel'
                },
                labels: {
                    navigation: 'Reldens - Administration Panel',
                    loginWelcome: 'Reldens',
                    pages: 'Server Management',
                    management: 'Management',
                    mapsWizard: 'Maps Generation and Import',
                    objectsImport: 'Objects Import',
                    skillsImport: 'Skills Import',
                    shuttingDown: 'Server is shutting down in:',
                    submitShutdownLabel: 'Shutdown Server',
                    submitCancelLabel: 'Cancel Server Shutdown'
                }
            });
            this.extendAdminTemplates(event);
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
            this.subscribers.roomsEntity = new RoomsEntitySubscriber(adminManager, this.config);
            this.subscribers.generatorsRoutes = new GeneratorsRoutesSubscriber(
                adminManager,
                themeManager.projectGenerateDataPath,
                themeManager.projectGeneratedDataPath
            );
        });
    }

    extendAdminTemplates(event)
    {
        if(!event?.serverManager?.themeManager?.adminTemplatesList?.fields?.edit){
            return;
        }
        let themeManager = event.serverManager.themeManager;
        themeManager.adminTemplatesList.fields.edit['tileset-file-item'] = 'tileset-file-item.html';
        themeManager.adminTemplatesList.fields.edit['tileset-alert-wrapper'] = 'tileset-alert-wrapper.html';
        let templatesPath = FileHandler.joinPaths(themeManager.projectAdminTemplatesPath, 'fields', 'edit');
        themeManager.adminTemplates.fields.edit['tileset-file-item'] = FileHandler.joinPaths(
            templatesPath,
            'tileset-file-item.html'
        );
        themeManager.adminTemplates.fields.edit['tileset-alert-wrapper'] = FileHandler.joinPaths(
            templatesPath,
            'tileset-alert-wrapper.html'
        );
    }
}

module.exports.AdminPlugin = AdminPlugin;
