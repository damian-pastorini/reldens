/**
 *
 * Reldens - Teams Server Plugin.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class TeamsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in TeamsPlugin.');
        }
        this.events.on('reldens.beforeSuperInitialGameData', async (superInitialGameData, roomGame) => {
            await this.onBeforeSuperInitialGameData(superInitialGameData, roomGame);
        });
    }

    async onBeforeSuperInitialGameData(superInitialGameData, roomGame)
    {
    }

}

module.exports.TeamsPlugin = TeamsPlugin;
