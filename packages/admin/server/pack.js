/**
 *
 * Reldens - AdminPack
 *
 */

const { AdminManager } = require('./admin-manager');
const { PackInterface } = require('../../features/pack-interface');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { Logger, sc } = require('@reldens/utils');

class AdminPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdminPack.');
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            let serverManager = event.serverManager;
            this.adminRoleId = props.adminRoleId
                || serverManager.configManager.adminRoleId
                || process.env.RELDENS_ADMIN_DEFAULT_ROLE_ID
                || false;
            let bucket = serverManager.themeManager.projectThemePath;
            await serverManager.themeManager.buildAdminCss();
            serverManager.app.use('/uploads', serverManager.express.static(bucket));
            let entities = AdminEntitiesGenerator.generateEntities(
                serverManager.dataServerConfig.loadedEntities,
                serverManager.dataServer.entityManager.entities
            );
            serverManager.dataServer.resources = AdminManager.prepareResources(entities);
            this.events.emit('reldens.beforeCreateAdminManager', this, event);
            serverManager.serverAdmin = new AdminManager({
                serverManager,
                app: serverManager.app,
                config: serverManager.configServer,
                databases: [serverManager.dataServer],
                translations: serverManager.dataServerConfig.translations,
                authenticateCallback: async (email, password) => {
                    return await serverManager.loginManager.roleAuthenticationCallback(
                        email,
                        password,
                        this.adminRoleId
                    );
                }
            });
            serverManager.serverAdmin.setupAdmin();
            this.events.emit('reldens.afterCreateAdminManager', this, event);
        });
    }

}

module.exports.AdminPack = AdminPack;
