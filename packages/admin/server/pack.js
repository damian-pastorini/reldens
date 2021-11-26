/**
 *
 * Reldens - AdminPack
 *
 */

const { AdminManager } = require('./admin-manager');
const { PackInterface } = require('../../features/pack-interface');
const { Logger, sc } = require('@reldens/utils');

class AdminPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdminPack.');
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            let serverManager = event.serverManager;
            let bucket = serverManager.configManager.processor.themeFullPath;
            serverManager.app.use('/uploads', serverManager.express.static(bucket));
            let entities = serverManager.dataServerConfig.preparedEntities;
            serverManager.dataServer.resources = AdminManager.prepareResources(entities);
            this.events.emit('reldens.beforeCreateAdminManager', this, event);
            serverManager.serverAdmin = new AdminManager({
                serverManager,
                app: serverManager.app,
                config: serverManager.configServer,
                databases: [serverManager.dataServer],
                translations: serverManager.dataServerConfig.translations,
                authenticateCallback: async (email, password) => {
                    let user = await serverManager.usersManager.loadUserByEmail(email);
                    if(user && user.role_id === 99){
                        let result = serverManager.loginManager.passwordManager.validatePassword(
                            password,
                            user.password
                        );
                        if(result){
                            return user;
                        }
                    }
                    return false;
                }
            });
            serverManager.serverAdmin.setupAdmin();
            this.events.emit('reldens.afterCreateAdminManager', this, event);
        });
    }

}

module.exports.AdminPack = AdminPack;
