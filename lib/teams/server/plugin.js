/**
 *
 * Reldens - Teams Server Plugin.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { TeamsMessageActions } = require('./message-actions');
const { PlayerSubscriber } = require('./subscribers/player-subscriber');
const { StatsUpdateSubscriber } = require('./subscribers/stats-update-subscriber');
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
            roomMessageActions.teams = new TeamsMessageActions({teamsPlugin: this});
        });
        this.events.on('reldens.createPlayerAfter', async (client, authResult, playerSchema, room) => {
            await PlayerSubscriber.enrichPlayerWithClan(client, playerSchema, room, this.events, this.modelsManager);
        });
        this.events.on('reldens.savePlayerStatsUpdateClient', async (client, playerSchema, room) => {
            await StatsUpdateSubscriber.updateTeamData({teamsPlugin: this, playerSchema});
        });
        this.teams = {};
    }

}

module.exports.TeamsPlugin = TeamsPlugin;
