/**
 *
 * Reldens - ActivateAdminSubscriber
 *
 */

const { AdminManager } = require('../admin-manager');
const { AdminManagerConfig } = require('../admin-manager-config');
const { Logger, sc } = require('@reldens/utils');

class ActivateAdminSubscriber
{

    async activateAdmin(event)
    {
        let serverManager = sc.get(event, 'serverManager', false);
        if(!serverManager){
            Logger.error('ServerManager not found in ActivateAdminSubscriber.');
            return false;
        }
        if(!serverManager.events){
            Logger.error('EventsManager not found in ActivateAdminSubscriber.');
            return false;
        }
        serverManager.events.emit('reldens.beforeCreateAdminManager', this);
        serverManager.serverAdmin = new AdminManager(new AdminManagerConfig(serverManager));
        serverManager.events.emit('reldens.beforeSetupAdminManager', this);
        await serverManager.serverAdmin.setupAdmin();
        serverManager.events.emit('reldens.afterCreateAdminManager', this);
    }

}

module.exports.ActivateAdminSubscriber = ActivateAdminSubscriber;
