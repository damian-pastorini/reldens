/**
 *
 * Reldens - AdminPlugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { SetupServerProperties } = require('../../features/server/setup-server-properties');
const { ActivateAdminSubscriber } = require('./subscribers/activate-admin-subscriber');
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
        this.listenEvents();
    }

    listenEvents()
    {
        this.events.on('reldens.serverBeforeListen', async (event) => {
            await this.activateAdminSubscriber.activateAdmin(event);
        });
    }

}

module.exports.AdminPlugin = AdminPlugin;
