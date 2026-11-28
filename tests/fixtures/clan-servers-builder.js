/**
 *
 * Reldens - ClanServersBuilder
 *
 * Builds the two servers of the clans sync tests: a teams plugin per server with its ClanCrossServerStateSync (signed
 * with the same test secret), the clan 10 loaded on each server with the given online players (their client messages
 * recorded), the fetch route dispatcher wired to both servers, and the two servers with the member online on the
 * second one, sent as a login does it (the local clan update and the awaited servers update).
 *
 */

const { Clan } = require('../../lib/teams/server/clan');
const { ClanCrossServerStateSync } = require('../../lib/teams/server/clan-cross-server-state-sync');
const { ClanUpdatesHandler } = require('../../lib/teams/server/clan-updates-handler');
const { TeamsConst } = require('../../lib/teams/constants');
const { ClanFixturesBuilder } = require('./clan-fixtures-builder');
const { FetchStubRouteDispatcher } = require('./fetch-stub-route-dispatcher');
const { ServerMessengerPropsBuilder } = require('./server-messenger-props-builder');

class ClanServersBuilder
{

    constructor()
    {
        /** @type {string} */
        this.firstServerUrl = 'http://server-1:8080';
        /** @type {string} */
        this.secondServerUrl = 'http://server-2:8081';
        /** @type {Object} */
        this.sharedProperties = {atk: {label: 'ATK', path: 'stats/atk', pathMax: 'statsBase/atk'}};
        /** @type {Array<Object>} */
        this.storedMembers = [
            {player_id: 1, related_players: {name: 'ImRoot'}},
            {player_id: 2, related_players: {name: 'Member'}}
        ];
        /** @type {Object<string, string>} */
        this.roomsServers = {'reldens-town': this.firstServerUrl, 'reldens-house-2': this.secondServerUrl};
    }

    /**
     * @param {string} serverSelfUrl
     * @param {Object<string, string>} [roomsServers]
     * @returns {Object}
     */
    createServer(serverSelfUrl, roomsServers = this.roomsServers)
    {
        let leaveEvents = [];
        let teamsPlugin = ClanFixturesBuilder.createTeamsPlugin({
            events: {
                emit: async (eventName, eventData) => 'reldens.clanLeaveBeforeSendUpdate' === eventName
                    && leaveEvents.push([eventData.playerId, eventData.disbandClan])
            },
            storedClanModel: false,
            leaveEvents
        });
        teamsPlugin.dataServer = {getEntity: () => ({
            loadByIdWithRelations: async () => teamsPlugin.storedClanModel,
            loadByWithRelations: async () => teamsPlugin.storedClanModel.related_clan_members
        })};
        teamsPlugin.clanCrossServerStateSync = new ClanCrossServerStateSync(Object.assign(
            ServerMessengerPropsBuilder.create(serverSelfUrl, roomsServers, 'test-secret', TeamsConst.SYNC.CLANS_ROUTE),
            {teamsPlugin, sharedProperties: this.sharedProperties}
        ));
        return teamsPlugin;
    }

    /**
     * @param {Object} teamsPlugin
     * @param {Array<Object>} playersData
     * @returns {{clan: Clan, players: Object}}
     */
    loadClanWithPlayers(teamsPlugin, playersData)
    {
        let clan = new Clan({
            id: 10,
            owner: {player_id: '1', playerName: 'ImRoot'},
            members: {1: this.storedMembers[0], 2: this.storedMembers[1]},
            sharedProperties: this.sharedProperties,
            serversSync: teamsPlugin.clanCrossServerStateSync
        });
        let players = {};
        for(let playerData of playersData){
            let playerSchema = ClanFixturesBuilder.createOwnerSchema(playerData.playerId, playerData.playerName);
            playerSchema.stats.atk = playerData.atk;
            playerData.messages = [];
            clan.join(playerSchema, {ref: {readyState: 1}, send: (type, message) => playerData.messages.push(message)}, {});
            players[playerData.playerId] = {playerSchema, messages: playerData.messages};
        }
        teamsPlugin.clans[10] = clan;
        return {clan, players};
    }

    /**
     * @param {Array<Object>} firstServerPlayers
     * @param {Array<Object>} secondServerPlayers
     * @returns {Object}
     */
    createServersWithClan(firstServerPlayers, secondServerPlayers)
    {
        let servers = {first: this.createServer(this.firstServerUrl), second: this.createServer(this.secondServerUrl)};
        servers.firstClan = this.loadClanWithPlayers(servers.first, firstServerPlayers);
        servers.secondClan = this.loadClanWithPlayers(servers.second, secondServerPlayers);
        return servers;
    }

    /**
     * @param {Object} servers
     * @param {Function} testCallback
     * @returns {Promise<void>}
     */
    async withServersFetch(servers, testCallback)
    {
        let routeHandlers = {};
        routeHandlers[this.firstServerUrl] = servers.first.clanCrossServerStateSync;
        routeHandlers[this.secondServerUrl] = servers.second.clanCrossServerStateSync;
        await FetchStubRouteDispatcher.withServers(routeHandlers, testCallback);
    }

    /**
     * @returns {Promise<Object>}
     */
    async createServersWithTheMemberOnline()
    {
        let servers = this.createServersWithClan(
            [{playerId: '1', playerName: 'ImRoot', atk: 100}],
            [{playerId: '2', playerName: 'Member', atk: 90}]
        );
        await this.withServersFetch(servers, async () => {
            await this.sendClanUpdate(servers.secondClan.clan);
        });
        return servers;
    }

    /**
     * @param {Clan} clan
     * @returns {Promise<boolean>}
     */
    async sendClanUpdate(clan)
    {
        ClanUpdatesHandler.updateClanPlayers(clan);
        return await clan.serversSync.sendUpdate(clan, clan.id);
    }

}

module.exports.ClanServersBuilder = ClanServersBuilder;
