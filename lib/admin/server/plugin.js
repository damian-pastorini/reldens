/**
 *
 * Reldens - AdminPlugin
 *
 */

const { AdminManager } = require('./admin-manager');
const { PluginInterface } = require('../../features/plugin-interface');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { Logger, sc } = require('@reldens/utils');

class AdminPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdminPlugin.');
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            let serverManager = event.serverManager;
            this.adminRoleId = sc.get(
                props,
                'adminRoleId',
                serverManager.configManager.get('server/admin/roleId', false)
            );
            let bucket = serverManager.themeManager.projectThemePath;
            await serverManager.themeManager.buildAdminCss();
            serverManager.app.use('/uploads', serverManager.express.static(bucket));
            let entities = AdminEntitiesGenerator.generateEntities(
                serverManager.dataServerConfig.loadedEntities,
                serverManager.dataServer.entityManager.entities
            );
            serverManager.dataServer.resources = AdminManager.prepareResources(entities);
            let adminManagerConfig = {
                serverManager,
                events: this.events,
                app: serverManager.app,
                config: serverManager.configServer, // is the config of the server itself (port, host, etc.)
                databases: [serverManager.dataServer],
                translations: serverManager.dataServerConfig.translations,
                authenticateCallback: async (email, password) => {
                    return await serverManager.loginManager.roleAuthenticationCallback(
                        email,
                        password,
                        this.adminRoleId
                    );
                }
            };
            this.events.emit('reldens.beforeCreateAdminManager', this, event);
            serverManager.serverAdmin = new AdminManager(adminManagerConfig);
            this.events.emit('reldens.beforeSetupAdminManager', this, event);
            serverManager.serverAdmin.setupAdmin();
            this.events.emit('reldens.afterCreateAdminManager', this, event);
        });
    }

}

module.exports.AdminPlugin = AdminPlugin;
