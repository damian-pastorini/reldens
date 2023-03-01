/**
 *
 * Reldens - Teams Server Plugin.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { TeamsMessageActions } = require('./message-actions');
const { CreatePlayerClanHandler } = require('./event-handlers/create-player-clan-handler');
const { CreatePlayerTeamHandler } = require('./event-handlers/create-player-team-handler');
const { StatsUpdateTeamHandler } = require('./event-handlers/stats-update-team-handler');
const { EndPlayerHitChangePointTeamHandler } = require('./event-handlers/end-player-hit-change-point-team-handler');
const { Logger, sc } = require('@reldens/utils');

class TeamsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in TeamsPlugin.');
        }
        this.teams = sc.get(props, 'teams', {});
        this.changingRoomPlayers = sc.get(props, 'changingRoomPlayers', {});
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.teams = new TeamsMessageActions({teamsPlugin: this});
        });
        this.events.on('reldens.createPlayerAfter', async (client, authResult, playerSchema, room) => {
            await CreatePlayerClanHandler.enrichPlayerWithClan(
                client,
                playerSchema,
                room,
                this.events,
                this.modelsManager,
                this
            );
            await CreatePlayerTeamHandler.joinExistentTeam(
                client,
                playerSchema,
                room,
                this.events,
                this.modelsManager,
                this
            );
        });
        this.events.on('reldens.savePlayerStatsUpdateClient', async (client, playerSchema, room) => {
            await StatsUpdateTeamHandler.updateTeam({teamsPlugin: this, playerSchema});
        });
        this.events.on('reldens.endPlayerHitChangePoint', async (event) => {
            await EndPlayerHitChangePointTeamHandler.savePlayerTeam(event.playerSchema, this);
        });
    }

}

module.exports.TeamsPlugin = TeamsPlugin;
