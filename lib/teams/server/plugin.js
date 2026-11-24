/**
 *
 * Reldens - Teams Server Plugin.
 *
 * Initializes and manages the teams and clans system on the server side.
 * Handles team and clan message actions, player creation with clan/team membership,
 * stats updates, room transitions, and integration with the chat system. A team member moving to a room of another
 * server keeps its team there through the signed teams sync route of the servers (TeamCrossServerStateSync), leaves
 * the clan connected players of this server, and the clans loaded on several servers share their online members and
 * their members changes through the signed clans sync route (ClanCrossServerStateSync).
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
const { TeamCrossServerStateSync } = require('./team-cross-server-state-sync');
const { ClanCrossServerStateSync } = require('./clan-cross-server-state-sync');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('./event-handlers/create-player-clan-handler').CreatePlayerClanHandler} CreatePlayerClanHandler
 * @typedef {import('../../chat/server/plugin').ChatPlugin} ChatPlugin
 * @typedef {import('./clan').Clan} Clan
 */
class TeamsPlugin extends PluginInterface
{

    constructor()
    {
        super();
        /** @type {TeamCrossServerStateSync|boolean} */
        this.teamCrossServerStateSync = false;
        /** @type {ClanCrossServerStateSync|boolean} */
        this.clanCrossServerStateSync = false;
        /** @type {Object} */
        this.teamsSharedProperties = {};
        /** @type {Object} */
        this.clanSharedProperties = {};
        /** @type {number} */
        this.clanNameLimit = TeamsConst.NAME_LIMIT;
        /** @type {number} */
        this.clanStartingPoints = TeamsConst.CLAN_STARTING_POINTS;
    }

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
        /** @type {Object<string, Object<string, boolean>>} */
        this.teamPendingInvites = sc.get(props, 'teamPendingInvites', {});
        /** @type {Object} */
        this.teamChangingRoomPlayers = sc.get(props, 'teamChangingRoomPlayers', {});
        /** @type {Object} */
        this.clanChangingRoomPlayers = sc.get(props, 'clanChangingRoomPlayers', {});
        /** @type {boolean} */
        this.clanOpenInvites = Boolean(props.config?.getWithoutLogs('client/clan/general/openInvites', false));
        this.teamsSharedProperties = props.config.getWithoutLogs('client/ui/teams/sharedProperties', {});
        this.clanSharedProperties = props.config.getWithoutLogs('client/ui/clan/sharedProperties', {});
        this.clanNameLimit = props.config.getWithoutLogs('server/clan/settings/nameLimit', TeamsConst.NAME_LIMIT);
        this.clanStartingPoints = props.config.getWithoutLogs(
            'server/clan/settings/startingPoints',
            TeamsConst.CLAN_STARTING_POINTS
        );
        /** @type {CreatePlayerClanHandler} */
        this.createPlayerClanHandler = new CreatePlayerClanHandler(props.config, this);
        this.teamCrossServerStateSync = new TeamCrossServerStateSync(Object.assign(
            {teamsPlugin: this, sharedProperties: this.teamsSharedProperties, routePath: TeamsConst.SYNC.TEAMS_ROUTE},
            props.serverToServerMessengerProps
        ));
        this.clanCrossServerStateSync = new ClanCrossServerStateSync(Object.assign(
            {teamsPlugin: this, sharedProperties: this.clanSharedProperties, routePath: TeamsConst.SYNC.CLANS_ROUTE},
            props.serverToServerMessengerProps
        ));
        this.events.on('reldens.serverBeforeListen', (event) => {
            for(let groupSync of [this.teamCrossServerStateSync, this.clanCrossServerStateSync]){
                event.serverManager.app.post(groupSync.routePath, groupSync.handleRouteRequest.bind(groupSync));
            }
        });
        this.events.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.teams = new TeamMessageActions({teamsPlugin: this});
            roomMessageActions.clan = new ClanMessageActions({teamsPlugin: this});
        });
        this.events.on('reldens.createPlayerAfter', async (client, userModel, playerSchema, room) => {
            this.teamCrossServerStateSync.localPlayers[playerSchema.player_id] = {playerSchema, client};
            await this.createPlayerClanHandler.enrichPlayerWithClan(client, playerSchema, room, this);
            await CreatePlayerTeamHandler.joinExistentTeam(client, playerSchema, this);
        });
        this.events.on('reldens.onSavePlayerStatsBefore', (event) => {
            let clan = this.fetchPlayerClan(event.playerSchema);
            if(!clan){
                return false;
            }
            return clan.revertModifiersOnSavedStats(event.playerSchema.player_id, event.objectState);
        });
        this.events.on('reldens.savePlayerStatsUpdateClient', async (client, playerSchema) => {
            await StatsUpdateHandler.updateTeam({teamsPlugin: this, playerSchema});
            await StatsUpdateHandler.updateClan({teamsPlugin: this, playerSchema});
        });
        this.events.on('reldens.endPlayerHitChangePoint', async (event) => {
            await this.savePlayerTeamOnRoomChange(event);
        });
        this.events.on('reldens.playerRelocateToRoom', async (event) => {
            await this.savePlayerTeamOnRoomChange(event);
        });
        this.events.on('reldens.removePlayerBefore', async(event) => {
            if(!event.playerSchema){
                return false;
            }
            this.teamCrossServerStateSync.removeLocalPlayer(event.playerSchema);
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

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async savePlayerTeamOnRoomChange(event)
    {
        let serverUrl = this.teamCrossServerStateSync.serverUrlForRoom(event.changeData.next);
        if('' === serverUrl){
            return await EndPlayerHitChangePointTeamHandler.savePlayerTeam(event.playerSchema, this);
        }
        await ClanDisconnect.disconnectPlayer(event.playerSchema, this);
        return await this.teamCrossServerStateSync.moveMemberToServer(event.playerSchema, serverUrl);
    }

    /**
     * @param {Object} playerSchema
     * @returns {Clan|boolean}
     */
    fetchPlayerClan(playerSchema)
    {
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            return false;
        }
        let clan = sc.get(this.clans, clanId, false);
        if(!clan){
            //Logger.debug('Expected, Clan not found: '+clanId);
            return false;
        }
        return clan;
    }

}

module.exports.TeamsPlugin = TeamsPlugin;
