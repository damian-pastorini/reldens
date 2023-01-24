/**
 *
 * Reldens - Teams Server Plugin.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { TeamsMessageActions } = require('./message-actions');
const { PlayerSubscriber } = require('subscribers/player-subscriber');
const { Logger, sc } = require('@reldens/utils');

class TeamsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in TeamsPlugin.');
        }
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.teams = new TeamsMessageActions();
        });
        this.events.on('reldens.createPlayerAfter', async (client, authResult, currentPlayer, room) => {
            await PlayerSubscriber.enrichPlayerWithClan(client, currentPlayer, room, this.events, this.modelsManager);
        });
    }

}

module.exports.TeamsPlugin = TeamsPlugin;
