/**
 *
 * Reldens - AdminPack
 *
 */

const { AdminManager } = require('./admin-manager');
const { PackInterface } = require('../../features/pack-interface');
const { EntitiesLoader } = require('../../game/server/entities-loader');
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
            let loadEntitiesOptions = {
                serverManager,
                projectRoot: serverManager.projectRoot,
                projectTheme: serverManager.configManager.processor.projectTheme,
                bucketFullPath: bucket,
                withConfig: true,
                withTranslations: true,
                storageDriver: serverManager.dataServerConfig.storageDriver
            };
            let loadedEntities = EntitiesLoader.loadEntities(loadEntitiesOptions);
            if(false === loadedEntities){
                Logger.error('Entities could not be loaded.');
                return false;
            }
            let {entities, translations} = loadedEntities;
            serverManager.dataServer.resources = AdminManager.prepareResources(entities);
            this.events.emit('reldens.beforeCreateAdminManager', this, event);
            serverManager.serverAdmin = new AdminManager({
                serverManager,
                app: serverManager.app,
                config: serverManager.configServer,
                databases: [serverManager.dataServer],
                translations,
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
