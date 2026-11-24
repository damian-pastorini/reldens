/**
 *
 * Reldens - Test Clan Cross Server State Sync
 *
 * Tests the clan kept between two servers wired through the fetch route dispatcher: a member joining on the other
 * server is listed online on both servers with its data; a clan update reaches every online member once with no other
 * server and is sent again only when the other server answer changes the remote members (ISSUE #471); a members change
 * makes the other server load the stored
 * members again, dropping a member that left and sending the removed message to its online players when the clan was
 * disbanded; the last member disconnecting on a server removes it from the other server, which answers no members when
 * the clan is not loaded there; and a server change disconnects a clan player that is changing the scene, which a
 * scene change on the same server keeps.
 *
 */

const { BaseTest } = require('./base-test');
const { Clan } = require('../lib/teams/server/clan');
const { ClanCrossServerStateSync } = require('../lib/teams/server/clan-cross-server-state-sync');
const { ClanUpdatesHandler } = require('../lib/teams/server/clan-updates-handler');
const { ClanDisconnect } = require('../lib/teams/server/message-actions/clan-disconnect');
const { TeamsConst } = require('../lib/teams/constants');
const { ClanFixturesBuilder } = require('./fixtures/clan-fixtures-builder');
const { FetchStubRouteDispatcher } = require('./fixtures/fetch-stub-route-dispatcher');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');

class TestClanCrossServerStateSync extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.firstServerUrl = 'http://server-1:8080';
        this.secondServerUrl = 'http://server-2:8081';
        this.sharedProperties = {atk: {label: 'ATK', path: 'stats/atk', pathMax: 'statsBase/atk'}};
        this.storedMembers = [
            {player_id: 1, related_players: {name: 'ImRoot'}},
            {player_id: 2, related_players: {name: 'Member'}}
        ];
        this.roomsServers = {'reldens-town': this.firstServerUrl, 'reldens-house-2': this.secondServerUrl};
    }

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

    createServersWithClan(firstServerPlayers, secondServerPlayers)
    {
        let servers = {first: this.createServer(this.firstServerUrl), second: this.createServer(this.secondServerUrl)};
        servers.firstClan = this.loadClanWithPlayers(servers.first, firstServerPlayers);
        servers.secondClan = this.loadClanWithPlayers(servers.second, secondServerPlayers);
        return servers;
    }

    async withServersFetch(servers, testCallback)
    {
        let routeHandlers = {};
        routeHandlers[this.firstServerUrl] = servers.first.clanCrossServerStateSync;
        routeHandlers[this.secondServerUrl] = servers.second.clanCrossServerStateSync;
        await FetchStubRouteDispatcher.withServers(routeHandlers, testCallback);
    }

    async createServersWithTheMemberOnline()
    {
        let servers = this.createServersWithClan(
            [{playerId: '1', playerName: 'ImRoot', atk: 100}],
            [{playerId: '2', playerName: 'Member', atk: 90}]
        );
        await this.withServersFetch(servers, async () => {
            ClanUpdatesHandler.updateClanPlayers(servers.secondClan.clan);
        });
        return servers;
    }

    async testAMemberOnTheOtherServerIsListedOnlineOnBothServers()
    {
        await this.test('a clan member joining on the other server is listed online on both servers with its data', async () => {
            let servers = await this.createServersWithTheMemberOnline();
            let ownerUpdate = [...servers.firstClan.players['1'].messages].pop();
            let memberUpdate = [...servers.secondClan.players['2'].messages].pop();
            let expectedMemberData = {
                name: 'Member',
                player_id: '2',
                sessionId: '',
                sharedProperties: {atk: {label: 'ATK', value: 90, max: 100}}
            };
            this.assert.deepStrictEqual(
                [
                    servers.firstClan.clan.remotePlayers,
                    Object.keys(servers.secondClan.clan.remotePlayers),
                    servers.secondClan.clan.remotePlayers['1'].serverUrl,
                    [ownerUpdate.act, Object.keys(ownerUpdate.players)],
                    [memberUpdate.act, Object.keys(memberUpdate.players)]
                ],
                [
                    {2: {serverUrl: this.secondServerUrl, data: expectedMemberData}},
                    ['1'],
                    this.firstServerUrl,
                    [TeamsConst.ACTIONS.CLAN_UPDATE, ['2']],
                    [TeamsConst.ACTIONS.CLAN_UPDATE, ['1']]
                ]
            );
        });
    }

    async testAClanUpdateReachesEveryMemberOnceWithNoOtherServers()
    {
        await this.test('a clan update reaches every online member once on a server with no other servers', async () => {
            let server = this.createServer(this.firstServerUrl, {'reldens-town': this.firstServerUrl});
            let loaded = this.loadClanWithPlayers(server, [
                {playerId: '1', playerName: 'ImRoot', atk: 100},
                {playerId: '2', playerName: 'Member', atk: 90}
            ]);
            await FetchStubRouteDispatcher.withServers({}, async () => {
                ClanUpdatesHandler.updateClanPlayers(loaded.clan);
            });
            this.assert.deepStrictEqual(
                [
                    server.clanCrossServerStateSync.otherServersUrls,
                    loaded.players['1'].messages.map(message => [message.act, Object.keys(message.players)]),
                    loaded.players['2'].messages.map(message => [message.act, Object.keys(message.players)])
                ],
                [[], [[TeamsConst.ACTIONS.CLAN_UPDATE, ['2']]], [[TeamsConst.ACTIONS.CLAN_UPDATE, ['1']]]]
            );
        });
    }

    async testTheClanPlayersAreSentAgainOnlyWhenAnAnswerChangesTheRemoteMembers()
    {
        await this.test('a clan update is sent again only when the other server answer changes the remote members', async () => {
            let servers = await this.createServersWithTheMemberOnline();
            let memberMessages = servers.secondClan.players['2'].messages;
            let messagesOnChange = memberMessages.map(message => [message.act, Object.keys(message.players)]);
            await this.withServersFetch(servers, async () => {
                ClanUpdatesHandler.updateClanPlayers(servers.secondClan.clan);
            });
            this.assert.deepStrictEqual(
                [
                    messagesOnChange,
                    memberMessages.slice(messagesOnChange.length).map(message => [message.act, Object.keys(message.players)])
                ],
                [
                    [[TeamsConst.ACTIONS.CLAN_UPDATE, []], [TeamsConst.ACTIONS.CLAN_UPDATE, ['1']]],
                    [[TeamsConst.ACTIONS.CLAN_UPDATE, ['1']]]
                ]
            );
        });
    }

    async testAMembersChangeLoadsTheStoredMembers()
    {
        await this.test('a members change loads the stored members, drops the left member and a disband sends the removed message', async () => {
            let servers = await this.createServersWithTheMemberOnline();
            servers.first.storedClanModel = {related_clan_members: [this.storedMembers[0]]};
            let serversSync = servers.second.clanCrossServerStateSync;
            await this.withServersFetch(servers, async () => {
                await serversSync.sendToServers(serversSync.otherServersUrls, TeamsConst.SYNC.MEMBERS, 10, {
                    isDisbanded: false
                });
            });
            let afterLeave = [
                Object.keys(servers.firstClan.clan.members),
                servers.firstClan.clan.remotePlayers,
                Object.keys([...servers.firstClan.players['1'].messages].pop().players)
            ];
            await this.withServersFetch(servers, async () => {
                await serversSync.sendToServers(serversSync.otherServersUrls, TeamsConst.SYNC.MEMBERS, 10, {
                    isDisbanded: true
                });
            });
            this.assert.deepStrictEqual(
                [
                    afterLeave,
                    servers.first.clans,
                    [...servers.firstClan.players['1'].messages].pop(),
                    servers.firstClan.players['1'].playerSchema.privateData.clan,
                    servers.first.leaveEvents
                ],
                [
                    [['1'], {}, []],
                    {},
                    {act: TeamsConst.ACTIONS.CLAN_REMOVED, id: '1', listener: TeamsConst.CLAN_KEY},
                    false,
                    [['1', true]]
                ]
            );
        });
    }

    async testTheLastDisconnectRemovesTheServerMembers()
    {
        await this.test('the last member disconnecting on a server is removed from the other server clan', async () => {
            let servers = await this.createServersWithTheMemberOnline();
            let remoteBeforeDisconnect = Object.keys(servers.firstClan.clan.remotePlayers);
            await this.withServersFetch(servers, async () => {
                await ClanDisconnect.execute(servers.secondClan.players['2'].playerSchema, servers.second);
            });
            await this.withServersFetch(servers, async () => {
                ClanUpdatesHandler.updateClanPlayers(servers.firstClan.clan);
            });
            this.assert.deepStrictEqual(
                [
                    remoteBeforeDisconnect,
                    servers.second.clans,
                    servers.firstClan.clan.remotePlayers,
                    [...servers.firstClan.players['1'].messages].pop().players
                ],
                [['2'], {}, {}, {}]
            );
        });
    }

    async testAServerChangeDisconnectsAPlayerChangingTheScene()
    {
        await this.test('a server change disconnects a clan player changing the scene, a scene change keeps it', async () => {
            let servers = this.createServersWithClan(
                [{playerId: '1', playerName: 'ImRoot', atk: 100}, {playerId: '2', playerName: 'Member', atk: 90}],
                []
            );
            let changingMember = servers.firstClan.players['2'].playerSchema;
            changingMember.physicalBody = {isChangingScene: true};
            let sceneChangeResult = await ClanDisconnect.execute(changingMember, servers.first);
            let playersOnSceneChange = Object.keys(servers.firstClan.clan.players);
            let serverChangeResult = false;
            await this.withServersFetch(servers, async () => {
                serverChangeResult = await ClanDisconnect.disconnectPlayer(changingMember, servers.first);
            });
            this.assert.deepStrictEqual(
                [sceneChangeResult, playersOnSceneChange, serverChangeResult, Object.keys(servers.firstClan.clan.players)],
                [false, ['1', '2'], true, ['1']]
            );
        });
    }

}

module.exports.TestClanCrossServerStateSync = TestClanCrossServerStateSync;
