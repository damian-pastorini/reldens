/**
 *
 * Reldens - Teams Server Plugin.
 *
 * Initializes and manages the teams and clans system on the server side.
 * Handles team and clan message actions, player creation with clan/team membership,
 * stats updates, room transitions, and integration with the chat system.
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

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('./event-handlers/create-player-clan-handler').CreatePlayerClanHandler} CreatePlayerClanHandler
 * @typedef {import('../../chat/server/plugin').ChatPlugin} ChatPlugin
 */
class TeamsPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in TeamsPlugin.');
            return false;
        }
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('DataServer undefined in TeamsPlugin.');
            return false;
        }
        /** @type {Object} */
        this.teams = sc.get(props, 'teams', {});
        /** @type {Object} */
        this.clans = sc.get(props, 'clans', {});
        /** @type {Object} */
        this.teamChangingRoomPlayers = sc.get(props, 'teamChangingRoomPlayers', {});
        /** @type {Object} */
        this.clanChangingRoomPlayers = sc.get(props, 'clanChangingRoomPlayers', {});
        /** @type {CreatePlayerClanHandler} */
        this.createPlayerClanHandler = new CreatePlayerClanHandler(props.config, this);
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.teams = new TeamMessageActions({teamsPlugin: this});
            roomMessageActions.clan = new ClanMessageActions({teamsPlugin: this});
        });
        this.events.on('reldens.createPlayerAfter', async (client, userModel, playerSchema, room) => {
            await this.createPlayerClanHandler.enrichPlayerWithClan(client, playerSchema, room, this);
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
        /** @type {ChatPlugin|undefined} */
        this.chatPlugin = props.featuresManager.featuresList?.chat?.package;
        if(this.chatPlugin){
            let chatMessageActions = new ChatMessageActions({events: this.events, chatPlugin: this.chatPlugin});
            chatMessageActions.listenEvents();
        }
        return true;
    }

}

module.exports.TeamsPlugin = TeamsPlugin;
