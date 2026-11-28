/**
 *
 * Reldens - Test Team Cross Server State Sync
 *
 * Tests the team kept between two servers wired through a fake fetch that delivers every signed request to the other
 * server route handler: a member moving to a room of the other server keeps its team there and both servers list both
 * players with the data of the remote one; a member leaving on the other server disbands the team on both; an arrival
 * for a player already playing on the destination joins it right away and queues the update of the team servers (one
 * update after the update interval); a leave a server does not answer is logged and answers false; a failed arrival
 * drops the member and disbands
 * the team; a request with a forged token or signed for another server is rejected; and only a room of another server
 * counts as a server change.
 *
 */

const { BaseTest } = require('./base-test');
const { Team } = require('../lib/teams/server/team');
const { TeamCrossServerStateSync } = require('../lib/teams/server/team-cross-server-state-sync');
const { CreatePlayerTeamHandler } = require('../lib/teams/server/event-handlers/create-player-team-handler');
const { TeamLeave } = require('../lib/teams/server/message-actions/team-leave');
const { TeamsConst } = require('../lib/teams/constants');
const { FetchStubRouteDispatcher } = require('./fixtures/fetch-stub-route-dispatcher');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');
const { ScheduledTimeouts } = require('./fixtures/scheduled-timeouts');
const { Logger, sc } = require('@reldens/utils');

class TestTeamCrossServerStateSync extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.firstServerUrl = 'http://server-1:8080';
        this.secondServerUrl = 'http://server-2:8081';
        this.sharedProperties = {hp: {label: 'HP', path: 'stats/hp', pathMax: 'statsBase/hp'}};
    }

    createServer(serverSelfUrl)
    {
        let teamsPlugin = {teams: {}, teamChangingRoomPlayers: {}, events: {emit: async () => true}};
        teamsPlugin.teamCrossServerStateSync = new TeamCrossServerStateSync(Object.assign(
            ServerMessengerPropsBuilder.create(
                serverSelfUrl,
                {'reldens-town': this.firstServerUrl, 'reldens-house-2': this.secondServerUrl},
                'test-secret',
                TeamsConst.SYNC.TEAMS_ROUTE
            ),
            {teamsPlugin, sharedProperties: this.sharedProperties}
        ));
        return teamsPlugin;
    }

    createPlayerSessions(sessionsData)
    {
        let sessions = [];
        for(let {playerId, playerName, hp, messages} of sessionsData){
            let player = {player_id: playerId, playerName, sessionId: 's'+playerId, currentTeam: false};
            player.stats = {hp};
            player.statsBase = {hp: 100};
            sessions.push({player, client: {ref: {readyState: 1}, send: (type, message) => messages.push(message)}});
        }
        return sessions;
    }

    createServersWithTeam()
    {
        let servers = {first: this.createServer(this.firstServerUrl), second: this.createServer(this.secondServerUrl)};
        let messages = {owner: [], member: []};
        let [ownerSession, memberSession] = this.createPlayerSessions([
            {playerId: 2, playerName: 'owner', hp: 50, messages: messages.owner},
            {playerId: 1, playerName: 'member', hp: 70, messages: messages.member}
        ]);
        let team = new Team({
            owner: ownerSession.player,
            ownerClient: ownerSession.client,
            sharedProperties: this.sharedProperties,
            serversSync: servers.first.teamCrossServerStateSync
        });
        team.join(memberSession.player, memberSession.client);
        ownerSession.player.currentTeam = 2;
        memberSession.player.currentTeam = 2;
        servers.first.teams[2] = team;
        return {servers, messages, owner: ownerSession.player, member: memberSession.player};
    }

    async withServersFetch(servers, testCallback, isRouteAvailable = true)
    {
        await FetchStubRouteDispatcher.withServers({
            [this.firstServerUrl]: servers.first.teamCrossServerStateSync,
            [this.secondServerUrl]: servers.second.teamCrossServerStateSync
        }, testCallback, isRouteAvailable);
    }

    async moveMemberAndJoin(teamSetup)
    {
        let secondServerMessages = [];
        let [arrivedSession] = this.createPlayerSessions([
            {playerId: 1, playerName: 'member', hp: 70, messages: secondServerMessages}
        ]);
        await this.withServersFetch(teamSetup.servers, async () => {
            teamSetup.isMoved = await teamSetup.servers.first.teamCrossServerStateSync.moveMemberToServer(
                teamSetup.member,
                this.secondServerUrl
            );
            await CreatePlayerTeamHandler.joinExistentTeam(
                arrivedSession.client,
                arrivedSession.player,
                teamSetup.servers.second
            );
        });
        teamSetup.arrivedMember = arrivedSession.player;
        teamSetup.secondServerMessages = secondServerMessages;
        return teamSetup;
    }

    mapTeamState(teamsPlugin)
    {
        let teamsState = {};
        for(let teamId of Object.keys(teamsPlugin.teams)){
            let {players, remotePlayers} = teamsPlugin.teams[teamId];
            let remote = Object.keys(remotePlayers).map(playerId => [playerId, remotePlayers[playerId].serverUrl]);
            teamsState[teamId] = {local: Object.keys(players), remote};
        }
        return teamsState;
    }

    async testAMovedMemberKeepsItsTeamOnTheOtherServer()
    {
        await this.test('a member moving to a room of the other server keeps its team there and both servers list both', async () => {
            let teamSetup = await this.moveMemberAndJoin(this.createServersWithTeam());
            let lastUpdate = [...teamSetup.secondServerMessages].pop();
            this.assert.deepStrictEqual(
                [
                    teamSetup.isMoved,
                    this.mapTeamState(teamSetup.servers.first),
                    this.mapTeamState(teamSetup.servers.second),
                    teamSetup.arrivedMember.currentTeam,
                    teamSetup.member.currentTeam,
                    teamSetup.servers.second.teamChangingRoomPlayers
                ],
                [
                    true,
                    {2: {local: ['2'], remote: [['1', this.secondServerUrl]]}},
                    {2: {local: ['1'], remote: [['2', this.firstServerUrl]]}},
                    2,
                    false,
                    {}
                ]
            );
            this.assert.deepStrictEqual(
                [lastUpdate.act, lastUpdate.id, lastUpdate.leaderName, lastUpdate.players],
                [
                    TeamsConst.ACTIONS.TEAM_UPDATE,
                    2,
                    'owner',
                    {2: {name: 'owner', player_id: 2, sessionId: 's2', sharedProperties: {hp: {label: 'HP', value: 50, max: 100}}}}
                ]
            );
        });
    }

    async testTheMemberLeavingOnTheOtherServerDisbandsBothTeams()
    {
        await this.test('a member leaving on the other server disbands the team on both servers', async () => {
            let teamSetup = await this.moveMemberAndJoin(this.createServersWithTeam());
            await this.withServersFetch(teamSetup.servers, async () => {
                await TeamLeave.execute({}, teamSetup.arrivedMember, teamSetup.servers.second);
            });
            let teamLeftMessage = {act: TeamsConst.ACTIONS.TEAM_LEFT, id: 2, listener: TeamsConst.KEY};
            this.assert.deepStrictEqual(
                [
                    teamSetup.servers.first.teams,
                    teamSetup.servers.second.teams,
                    [...teamSetup.messages.owner].pop(),
                    [...teamSetup.secondServerMessages].pop(),
                    teamSetup.owner.currentTeam
                ],
                [{}, {}, teamLeftMessage, teamLeftMessage, false]
            );
        });
    }

    async testAnArrivalForAPlayingPlayerJoinsItRightAway()
    {
        await this.test('an arrival for a player already playing on the destination joins it right away', async () => {
            let teamSetup = this.createServersWithTeam();
            let arrivedMessages = [];
            let [arrivedSession] = this.createPlayerSessions([
                {playerId: 1, playerName: 'member', hp: 70, messages: arrivedMessages}
            ]);
            let arrivedMember = arrivedSession.player;
            teamSetup.servers.second.teamCrossServerStateSync.localPlayers[arrivedMember.player_id] = {
                playerSchema: arrivedMember,
                client: arrivedSession.client
            };
            let queuedTimeouts = new ScheduledTimeouts();
            await this.withServersFetch(teamSetup.servers, async () => {
                await queuedTimeouts.capture(async () => {
                    await teamSetup.servers.first.teamCrossServerStateSync.moveMemberToServer(
                        teamSetup.member,
                        this.secondServerUrl
                    );
                });
            });
            let queuedDelays = queuedTimeouts.scheduledTimeouts.map(scheduledTimeout => scheduledTimeout.delayMs);
            await this.withServersFetch(teamSetup.servers, async () => {
                await queuedTimeouts.scheduledTimeouts[0].timeoutCallback();
            });
            this.assert.deepStrictEqual(
                [
                    arrivedMember.currentTeam,
                    this.mapTeamState(teamSetup.servers.second),
                    teamSetup.servers.second.teamChangingRoomPlayers,
                    queuedDelays,
                    this.mapTeamState(teamSetup.servers.first)
                ],
                [
                    2,
                    {2: {local: ['1'], remote: [['2', this.firstServerUrl]]}},
                    {},
                    [TeamsConst.SYNC.UPDATE_INTERVAL_MS],
                    {2: {local: ['2'], remote: [['1', this.secondServerUrl]]}}
                ]
            );
            this.assert.strictEqual([...arrivedMessages].pop().act, TeamsConst.ACTIONS.TEAM_UPDATE);
        });
    }

    async testServersThatDroppedEachOtherMembersFindThemAgain()
    {
        await this.test('servers that dropped each other members find them again on the next update once they answer (ISSUE #504)', async () => {
            let {servers} = await this.moveMemberAndJoin(this.createServersWithTeam());
            let bothServers = [servers.first, servers.second];
            await FetchStubRouteDispatcher.withServers({}, async () => {
                for(let server of bothServers){
                    await server.teamCrossServerStateSync.sendUpdate(server.teams[2], 2);
                }
            });
            let droppedServers = bothServers.map(server => server.teamCrossServerStateSync.fetchGroupServersUrls(server.teams[2]));
            let droppedState = sc.toJsonString([this.mapTeamState(servers.first), this.mapTeamState(servers.second)]);
            await this.withServersFetch(servers, async () => await servers.first.teamCrossServerStateSync.sendUpdate(servers.first.teams[2], 2));
            this.assert.deepStrictEqual(
                [droppedServers, droppedState, [this.mapTeamState(servers.first), this.mapTeamState(servers.second)]],
                [
                    [[this.secondServerUrl], [this.firstServerUrl]],
                    sc.toJsonString([{2: {local: ['2'], remote: []}}, {2: {local: ['1'], remote: []}}]),
                    [{2: {local: ['2'], remote: [['1', this.secondServerUrl]]}}, {2: {local: ['1'], remote: [['2', this.firstServerUrl]]}}]
                ]
            );
        });
    }

    async testATeamLeaveNotAnsweredIsLoggedAndAnswersFalse()
    {
        await this.test('a team leave that a server does not answer is logged and answers false, an answered one true', async () => {
            let teamSetup = await this.moveMemberAndJoin(this.createServersWithTeam());
            let serversSync = teamSetup.servers.first.teamCrossServerStateSync;
            let loggerWarning = Logger.warning;
            let loggedWarnings = [];
            Logger.warning = (...logArguments) => loggedWarnings.push(logArguments);
            let isNotAnsweredSent = true;
            await FetchStubRouteDispatcher.withServers({}, async () => {
                isNotAnsweredSent = await serversSync.sendLeave([this.secondServerUrl], 2, 1);
            });
            Logger.warning = loggerWarning;
            let isAnsweredSent = false;
            await this.withServersFetch(teamSetup.servers, async () => {
                isAnsweredSent = await serversSync.sendLeave([this.secondServerUrl], 2, '');
            });
            this.assert.deepStrictEqual(
                [isNotAnsweredSent, loggedWarnings, isAnsweredSent, teamSetup.servers.second.teams],
                [
                    false,
                    [['Team leave not answered.', {serverUrl: this.secondServerUrl, teamId: 2, playerId: 1}]],
                    true,
                    {}
                ]
            );
        });
    }

    async testAFailedArrivalDropsTheMember()
    {
        await this.test('a failed arrival drops the member and disbands the team of two', async () => {
            let teamSetup = this.createServersWithTeam();
            let isMoved = true;
            await this.withServersFetch(teamSetup.servers, async () => {
                isMoved = await teamSetup.servers.first.teamCrossServerStateSync.moveMemberToServer(
                    teamSetup.member,
                    this.secondServerUrl
                );
            }, false);
            this.assert.deepStrictEqual(
                [isMoved, teamSetup.servers.first.teams, [...teamSetup.messages.owner].pop().act, teamSetup.owner.currentTeam],
                [true, {}, TeamsConst.ACTIONS.TEAM_LEFT, false]
            );
        });
    }

    async testAForgedOrMisdirectedRequestIsRejected()
    {
        await this.test('a sync request with a forged token or signed for another server is rejected', async () => {
            let teamsPlugin = this.createServer(this.secondServerUrl);
            let firstServerSync = this.createServer(this.firstServerUrl).teamCrossServerStateSync;
            let arrivalPayload = {arrivingPlayerId: 1, players: {}};
            let forgedResult = await teamsPlugin.teamCrossServerStateSync.receiveRequest({body: {
                action: TeamsConst.SYNC.ARRIVE,
                targetId: '2',
                payload: sc.toJsonString(arrivalPayload),
                token: '1.forged'
            }});
            let misdirectedResult = true;
            let misdirectedHandlers = {};
            misdirectedHandlers[this.firstServerUrl] = teamsPlugin.teamCrossServerStateSync;
            await FetchStubRouteDispatcher.withServers(misdirectedHandlers, async () => {
                misdirectedResult = await firstServerSync.sendRequest(
                    this.firstServerUrl,
                    TeamsConst.SYNC.ARRIVE,
                    2,
                    arrivalPayload
                );
            });
            this.assert.deepStrictEqual(
                [forgedResult, misdirectedResult, teamsPlugin.teams, teamsPlugin.teamChangingRoomPlayers],
                [{isSuccess: false}, false, {}, {}]
            );
        });
    }

    async testOnlyARoomOfAnotherServerIsAServerChange()
    {
        await this.test('only a room of another server counts as a server change', async () => {
            let teamsSync = this.createServer(this.firstServerUrl).teamCrossServerStateSync;
            this.assert.deepStrictEqual(
                ['reldens-house-2', 'reldens-town', 'reldens-forest'].map(roomName => teamsSync.serverUrlForRoom(roomName)),
                [this.secondServerUrl, '', '']
            );
        });
    }

}

module.exports.TestTeamCrossServerStateSync = TestTeamCrossServerStateSync;
