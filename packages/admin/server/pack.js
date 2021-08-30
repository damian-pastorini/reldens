/**
 *
 * Reldens - AdminPack
 *
 */

const { AdminManager } = require('./admin-manager');
const { PackInterface } = require('../../features/pack-interface');
const { Logger, sc } = require('@reldens/utils');
const {EntitiesLoader} = require('../../game/server/entities-loader');

class AdminPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.getDef(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in AdminPack.');
        }
        this.events.on('reldens.serverBeforeListen', async (event) => {
            let {entities, translations} = EntitiesLoader.loadEntities(event.serverManager.projectRoot, true, true);
            event.serverManager.dataServer.resources = AdminManager.prepareResources(entities);
            this.events.emit('reldens.beforeCreateAdminManager', this, event);
            event.serverManager.serverAdmin = new AdminManager({
                serverManager: event.serverManager,
                app: event.serverManager.app,
                config: event.serverManager.configServer,
                databases: [event.serverManager.dataServer],
                translations
            });
            event.serverManager.serverAdmin.setupAdmin();
            this.events.emit('reldens.afterCreateAdminManager', this, event);
        });
    }

}

module.exports.AdminPack = AdminPack;
