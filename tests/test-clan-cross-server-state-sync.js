/**
 *
 * Reldens - Test Clan Cross Server State Sync
 *
 * Tests the clan kept between two servers wired through the fetch route dispatcher (ClanServersBuilder): a member
 * joining on the other server is listed online on both servers with its data; a clan update reaches every online
 * member once with no other server and is sent again only when the other server answer changes the remote members
 * (ISSUE #471); a members change makes the other server load the stored members again, dropping a member that left
 * and sending the removed message to its online players when the clan was disbanded; the last member disconnecting on
 * a server removes it from the other server, which answers no members when the clan is not loaded there; a server
 * change disconnects a clan player that is changing the scene, which a scene change on the same server keeps; the
 * queued updates send one update per interval with the data of that moment and nothing for a clan dropped meanwhile or
 * with no other servers; and a server that does not answer an update gets its members dropped (logged) until its next
 * update adds them again.
 *
 */

const { BaseTest } = require('./base-test');
const { ClanUpdatesHandler } = require('../lib/teams/server/clan-updates-handler');
const { ClanDisconnect } = require('../lib/teams/server/message-actions/clan-disconnect');
const { TeamsConst } = require('../lib/teams/constants');
const { ClanServersBuilder } = require('./fixtures/clan-servers-builder');
const { FetchStubRouteDispatcher } = require('./fixtures/fetch-stub-route-dispatcher');
const { ScheduledTimeouts } = require('./fixtures/scheduled-timeouts');
const { Logger } = require('@reldens/utils');

class TestClanCrossServerStateSync extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.clanServers = new ClanServersBuilder();
    }

    async testAMemberOnTheOtherServerIsListedOnlineOnBothServers()
    {
        await this.test('a clan member joining on the other server is listed online on both servers with its data', async () => {
            let servers = await this.clanServers.createServersWithTheMemberOnline();
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
                    {2: {serverUrl: this.clanServers.secondServerUrl, data: expectedMemberData}},
                    ['1'],
                    this.clanServers.firstServerUrl,
                    [TeamsConst.ACTIONS.CLAN_UPDATE, ['2']],
                    [TeamsConst.ACTIONS.CLAN_UPDATE, ['1']]
                ]
            );
        });
    }

    async testAClanUpdateReachesEveryMemberOnceWithNoOtherServers()
    {
        await this.test('a clan update reaches every online member once on a server with no other servers', async () => {
            let server = this.clanServers.createServer(
                this.clanServers.firstServerUrl,
                {'reldens-town': this.clanServers.firstServerUrl}
            );
            let loaded = this.clanServers.loadClanWithPlayers(server, [
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
            let servers = await this.clanServers.createServersWithTheMemberOnline();
            let memberMessages = servers.secondClan.players['2'].messages;
            let messagesOnChange = memberMessages.map(message => [message.act, Object.keys(message.players)]);
            await this.clanServers.withServersFetch(servers, async () => {
                await this.clanServers.sendClanUpdate(servers.secondClan.clan);
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

    async testTheQueuedUpdatesSendOneUpdatePerInterval()
    {
        await this.test('the queued updates send one update per interval with the data of that moment, never for a dropped clan', async () => {
            let servers = await this.clanServers.createServersWithTheMemberOnline();
            let secondClan = servers.secondClan.clan;
            let serversSync = servers.second.clanCrossServerStateSync;
            let memberSchema = servers.secondClan.players['2'].playerSchema;
            let queuedTimeouts = new ScheduledTimeouts();
            let queueResults = await queuedTimeouts.capture(async () => [
                serversSync.queueUpdate(secondClan, 10),
                serversSync.queueUpdate(secondClan, 10)
            ]);
            memberSchema.stats.atk = 40;
            await this.clanServers.withServersFetch(servers, async () => {
                await queuedTimeouts.scheduledTimeouts[0].timeoutCallback();
            });
            let afterQueuedUpdate = [
                servers.firstClan.clan.remotePlayers['2'].data.sharedProperties.atk.value,
                Object.keys(serversSync.queuedUpdates)
            ];
            let droppedTimeouts = new ScheduledTimeouts();
            await droppedTimeouts.capture(async () => serversSync.queueUpdate(secondClan, 10));
            delete servers.second.clans[10];
            memberSchema.stats.atk = 20;
            await this.clanServers.withServersFetch(servers, async () => {
                await droppedTimeouts.scheduledTimeouts[0].timeoutCallback();
            });
            this.assert.deepStrictEqual(
                [
                    queueResults,
                    queuedTimeouts.scheduledTimeouts.map(scheduledTimeout => scheduledTimeout.delayMs),
                    afterQueuedUpdate,
                    servers.firstClan.clan.remotePlayers['2'].data.sharedProperties.atk.value
                ],
                [[true, false], [TeamsConst.SYNC.UPDATE_INTERVAL_MS], [40, []], 40]
            );
        });
    }

    async testAClanWithNoOtherServersQueuesNothing()
    {
        await this.test('a clan with no other servers queues no update', async () => {
            let server = this.clanServers.createServer(
                this.clanServers.firstServerUrl,
                {'reldens-town': this.clanServers.firstServerUrl}
            );
            let loaded = this.clanServers.loadClanWithPlayers(server, [{playerId: '1', playerName: 'ImRoot', atk: 100}]);
            let scheduledTimeouts = new ScheduledTimeouts();
            let isQueued = await scheduledTimeouts.capture(async () => {
                return server.clanCrossServerStateSync.queueUpdate(loaded.clan, 10);
            });
            this.assert.deepStrictEqual([isQueued, scheduledTimeouts.scheduledTimeouts], [false, []]);
        });
    }

    async testAServerThatDoesNotAnswerGetsItsMembersDropped()
    {
        await this.test('a server that does not answer an update gets its members dropped and logged, its next update adds them again', async () => {
            let servers = await this.clanServers.createServersWithTheMemberOnline();
            let firstClan = servers.firstClan.clan;
            let loggerWarning = Logger.warning;
            let loggedWarnings = [];
            Logger.warning = (...logArguments) => loggedWarnings.push(logArguments);
            let isAnswered = true;
            await FetchStubRouteDispatcher.withServers(
                {[this.clanServers.firstServerUrl]: servers.first.clanCrossServerStateSync},
                async () => {
                    isAnswered = await firstClan.serversSync.sendUpdate(firstClan, 10);
                }
            );
            Logger.warning = loggerWarning;
            let afterFailedUpdate = [
                isAnswered,
                Object.keys(firstClan.remotePlayers),
                Object.keys([...servers.firstClan.players['1'].messages].pop().players),
                loggedWarnings
            ];
            await this.clanServers.withServersFetch(servers, async () => {
                await this.clanServers.sendClanUpdate(servers.secondClan.clan);
            });
            let droppedWarning = 'Group update not answered, those servers members are dropped.';
            this.assert.deepStrictEqual(
                [afterFailedUpdate, Object.keys(firstClan.remotePlayers)],
                [[false, [], [], [[droppedWarning, 10, [this.clanServers.secondServerUrl]]]], ['2']]
            );
        });
    }

    async testAMembersChangeLoadsTheStoredMembers()
    {
        await this.test('a members change loads the stored members, drops the left member and a disband sends the removed message', async () => {
            let servers = await this.clanServers.createServersWithTheMemberOnline();
            servers.first.storedClanModel = {related_clan_members: [this.clanServers.storedMembers[0]]};
            let serversSync = servers.second.clanCrossServerStateSync;
            await this.clanServers.withServersFetch(servers, async () => {
                await serversSync.sendToServers(serversSync.otherServersUrls, TeamsConst.SYNC.MEMBERS, 10, {
                    isDisbanded: false
                });
            });
            let afterLeave = [
                Object.keys(servers.firstClan.clan.members),
                servers.firstClan.clan.remotePlayers,
                Object.keys([...servers.firstClan.players['1'].messages].pop().players)
            ];
            await this.clanServers.withServersFetch(servers, async () => {
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
            let servers = await this.clanServers.createServersWithTheMemberOnline();
            let remoteBeforeDisconnect = Object.keys(servers.firstClan.clan.remotePlayers);
            await this.clanServers.withServersFetch(servers, async () => {
                await ClanDisconnect.execute(servers.secondClan.players['2'].playerSchema, servers.second);
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
            let servers = this.clanServers.createServersWithClan(
                [{playerId: '1', playerName: 'ImRoot', atk: 100}, {playerId: '2', playerName: 'Member', atk: 90}],
                []
            );
            let changingMember = servers.firstClan.players['2'].playerSchema;
            changingMember.physicalBody = {isChangingScene: true};
            let sceneChangeResult = await ClanDisconnect.execute(changingMember, servers.first);
            let playersOnSceneChange = Object.keys(servers.firstClan.clan.players);
            let serverChangeResult = false;
            await this.clanServers.withServersFetch(servers, async () => {
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
