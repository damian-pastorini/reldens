/**
 *
 * Reldens - ClanFixturesBuilder
 *
 * Builds the teams and clans of the teams tests. A synced team or clan gets the real cross server state sync of this
 * server with no other servers, whose sends are recorded as [action, target id, payload] instead of sent.
 *
 */

const { Clan } = require('../../lib/teams/server/clan');
const { Team } = require('../../lib/teams/server/team');
const { ClanFactory } = require('../../lib/teams/server/clan-factory');
const { ClanCrossServerStateSync } = require('../../lib/teams/server/clan-cross-server-state-sync');
const { TeamCrossServerStateSync } = require('../../lib/teams/server/team-cross-server-state-sync');
const { TeamsPlugin } = require('../../lib/teams/server/plugin');
const { TeamsConst } = require('../../lib/teams/constants');
const { ChatConst } = require('../../lib/chat/constants');
const { ServerMessengerPropsBuilder } = require('./server-messenger-props-builder');
const { sc } = require('@reldens/utils');

class ClanFixturesBuilder
{

    static createLevelModel()
    {
        return {
            id: 1,
            key: 1,
            label: '1',
            related_clan_levels_modifiers: [
                {id: 1, level_id: 1, key: 'clan_atk', property_key: 'stats/atk', operation: 1, value: '10'}
            ]
        };
    }

    static createClanModel()
    {
        return {
            id: 10,
            owner_id: 1,
            name: 'Test Clan',
            points: 0,
            related_players: {id: 1, name: 'ImRoot'},
            related_clan_members: [{player_id: 1}, {player_id: 2}],
            related_clan_levels: this.createLevelModel()
        };
    }

    static createClan()
    {
        return this.createSyncedClan({
            id: 10,
            owner: {player_id: '1', playerName: 'ImRoot'},
            members: {1: {player_id: 1}, 2: {player_id: 2}},
            modifiers: ClanFactory.mapModifiersFromLevelModel(this.createLevelModel())
        });
    }

    static createPlayerSchema(playerId = '1', atk = 100)
    {
        return {player_id: playerId, stats: {atk}, statsBase: {atk: 100}, privateData: {clan: 10}};
    }

    static createOwnerSchema(playerId = '1', playerName = 'ImRoot')
    {
        let ownerSchema = this.createPlayerSchema(playerId);
        ownerSchema.playerName = playerName;
        ownerSchema.state = {room_id: 1};
        ownerSchema.persistData = async () => true;
        ownerSchema.getPrivate = (key) => ownerSchema.privateData[key];
        ownerSchema.setPrivate = (key, value) => {
            ownerSchema.privateData[key] = value;
        };
        return ownerSchema;
    }

    static createChatRecordingClient(chatLines)
    {
        let client = {send: false};
        client.send = (type, message) => {
            if(sc.hasOwn(message, ChatConst.MESSAGE.KEY)){
                chatLines.push(message[ChatConst.MESSAGE.KEY]);
            }
        };
        return client;
    }

    static createDeletionsRecorder(entityKey, deletedRows)
    {
        return {
            delete: async (filters) => deletedRows.push({entityKey, filters}),
            deleteById: async (id) => deletedRows.push({entityKey, id})
        };
    }

    /**
     * @param {Object} SyncClass
     * @param {string} routePath
     * @param {Array<Array<string>>} sentSyncs
     * @returns {Object}
     */
    static createServersSync(SyncClass, routePath, sentSyncs)
    {
        let serversSync = new SyncClass(Object.assign(
            ServerMessengerPropsBuilder.create('http://self:8080', {}, 'test-secret', routePath),
            {teamsPlugin: {teams: {}, clans: {}}, sharedProperties: {}}
        ));
        serversSync.sendToServers = async (serversUrls, action, targetId, payload) => {
            sentSyncs.push([action, String(targetId), payload]);
            return [];
        };
        return serversSync;
    }

    /**
     * @param {Object} clanProps
     * @param {Array<Array<string>>} [sentSyncs]
     * @returns {Clan}
     */
    static createSyncedClan(clanProps, sentSyncs = [])
    {
        return new Clan(Object.assign(
            {serversSync: this.createServersSync(ClanCrossServerStateSync, TeamsConst.SYNC.CLANS_ROUTE, sentSyncs)},
            clanProps
        ));
    }

    /**
     * @param {Object} teamProps
     * @param {Array<Array<string>>} [sentSyncs]
     * @returns {Team}
     */
    static createSyncedTeam(teamProps, sentSyncs = [])
    {
        return new Team(Object.assign(
            {serversSync: this.createServersSync(TeamCrossServerStateSync, TeamsConst.SYNC.TEAMS_ROUTE, sentSyncs)},
            teamProps
        ));
    }

    static createTeamsPlugin(teamsPluginData)
    {
        let teamsPlugin = Object.create(TeamsPlugin.prototype);
        Object.assign(teamsPlugin, {teams: {}, clans: {}}, teamsPluginData);
        return teamsPlugin;
    }

    static createClanJoinDataServer(recordedCalls)
    {
        return {
            getEntity: (entityKey) => Object.assign(this.createDeletionsRecorder(entityKey, recordedCalls), {
                create: async (row) => recordedCalls.push({entityKey, created: row}),
                loadOneWithRelations: async (filters) => Object.assign({related_players: {name: 'ImRoot'}}, filters),
                loadOneByWithRelations: async () => false
            })
        };
    }

}

module.exports.ClanFixturesBuilder = ClanFixturesBuilder;
