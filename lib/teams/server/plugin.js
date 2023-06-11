/**
 *
 * Reldens - Teams Server Plugin.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { ClanMessageActions } = require('./clan-message-actions');
const { TeamMessageActions } = require('./team-message-actions');
const { CreatePlayerClanHandler } = require('./event-handlers/create-player-clan-handler');
const { CreatePlayerTeamHandler } = require('./event-handlers/create-player-team-handler');
const { StatsUpdateHandler } = require('./event-handlers/stats-update-handler');
const { EndPlayerHitChangePointTeamHandler } = require('./event-handlers/end-player-hit-change-point-team-handler');
const { TeamLeave } = require('./message-actions/team-leave');
const { ClanDisconnect } = require('./message-actions/clan-disconnect');
const { ChatMessageActions } = require('./message-actions/chat-message-actions');
const { Logger, sc } = require('@reldens/utils');

class TeamsPlugin extends PluginInterface
{

    async setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in TeamsPlugin.');
        }
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in TeamsPlugin.');
        }
        this.teams = sc.get(props, 'teams', {});
        this.clans = sc.get(props, 'clans', {});
        this.teamChangingRoomPlayers = sc.get(props, 'teamChangingRoomPlayers', {});
        this.clanChangingRoomPlayers = sc.get(props, 'clanChangingRoomPlayers', {});
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.teams = new TeamMessageActions({teamsPlugin: this});
            roomMessageActions.clan = new ClanMessageActions({teamsPlugin: this});
        });
        this.events.on('reldens.createPlayerAfter', async (client, userModel, playerSchema, room) => {
            await CreatePlayerClanHandler.enrichPlayerWithClan(client, playerSchema, room, this);
            await CreatePlayerTeamHandler.joinExistentTeam(client, playerSchema, this);
        });
        this.events.on('reldens.savePlayerStatsUpdateClient', async (client, playerSchema) => {
            await StatsUpdateHandler.updateTeam({teamsPlugin: this, playerSchema});
            await StatsUpdateHandler.updateClan({teamsPlugin: this, playerSchema});
        });
        this.events.on('reldens.endPlayerHitChangePoint', async (event) => {
            await EndPlayerHitChangePointTeamHandler.savePlayerTeam(event.playerSchema, this);
        });
        this.events.on('reldens.removePlayerBefore', async(event) => {
            await TeamLeave.execute(event.room, event.playerSchema, this);
            await ClanDisconnect.execute(event.playerSchema, this);
        });
        this.chatPlugin = props.featuresManager.featuresList?.chat?.package;
        if(this.chatPlugin){
            let chatMessageActions = new ChatMessageActions({events: this.events, chatPlugin: this.chatPlugin});
            chatMessageActions.listenEvents();
        }
    }

}

module.exports.TeamsPlugin = TeamsPlugin;
