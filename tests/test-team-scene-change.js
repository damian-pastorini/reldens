/**
 *
 * Reldens - Test Team Scene Change
 *
 * Tests the team state a scene change relies on: the owner joining its team again (after a scene change) replaces the
 * owner player and client of the team while a member join keeps them; the changing room record rejoins the team once
 * and is consumed, so a member that left after its scene change is not added again, and the record of a deleted team
 * leaves the player with no team; and the owner disband sends the disbanded line to a removed member through its team
 * client, also when that member plays in another scene than the owner.
 *
 */

const { BaseTest } = require('./base-test');
const { Team } = require('../lib/teams/server/team');
const { ChatMessageActions } = require('../lib/teams/server/message-actions/chat-message-actions');
const { CreatePlayerTeamHandler } = require('../lib/teams/server/event-handlers/create-player-team-handler');
const { TeamsConst } = require('../lib/teams/constants');
const { ChatConst } = require('../lib/chat/constants');

class TestTeamSceneChange extends BaseTest
{

    createTeamWithMember(memberMessages)
    {
        let teamPlayers = {
            owner: {player_id: 1, playerName: 'player1', currentTeam: 1, state: {room_id: 41}},
            member: {player_id: 2, playerName: 'player2', currentTeam: 1, state: {room_id: 114}}
        };
        teamPlayers.team = new Team({owner: teamPlayers.owner, ownerClient: {send: () => true}});
        teamPlayers.team.join(teamPlayers.member, {send: (type, message) => memberMessages.push(message)});
        return teamPlayers;
    }

    async testOwnerRejoinReplacesTheOwnerClient()
    {
        await this.test('the owner joining its team again replaces the owner player and client', async () => {
            let owner = {player_id: 1, playerName: 'player1', currentTeam: 1, state: {room_id: 41}};
            let ownerClient = {send: () => true};
            let team = new Team({owner, ownerClient});
            team.join({player_id: 2, playerName: 'player2', currentTeam: 1, state: {room_id: 41}}, {send: () => true});
            this.assert.strictEqual(team.owner, owner);
            this.assert.strictEqual(team.ownerClient, ownerClient);
            team.leave(owner);
            let rejoinedOwner = {player_id: 1, playerName: 'player1', currentTeam: false, state: {room_id: 114}};
            let newOwnerClient = {send: () => true};
            this.assert.strictEqual(team.join(rejoinedOwner, newOwnerClient), true);
            this.assert.strictEqual(team.owner, rejoinedOwner);
            this.assert.strictEqual(team.ownerClient, newOwnerClient);
            this.assert.strictEqual(team.clients[1], newOwnerClient);
            this.assert.deepStrictEqual(Object.keys(team.players).sort(), ['1', '2']);
        });
    }

    async testChangingRoomRecordIsConsumed()
    {
        await this.test('the changing room record rejoins the team once and is consumed', async () => {
            let owner = {player_id: 1, playerName: 'player1', currentTeam: 1, state: {room_id: 41}};
            let team = new Team({owner, ownerClient: {send: () => true}});
            let teamsPlugin = {teams: {1: team}, teamChangingRoomPlayers: {2: {teamId: 1, leavingPlayerSessionId: 's2'}}};
            let member = {player_id: 2, playerName: 'player2', currentTeam: false, state: {room_id: 114}};
            await CreatePlayerTeamHandler.joinExistentTeam({send: () => true}, member, teamsPlugin);
            this.assert.strictEqual(member.currentTeam, 1);
            this.assert.deepStrictEqual(teamsPlugin.teamChangingRoomPlayers, {});
            team.leave(member);
            let memberNextScene = {player_id: 2, playerName: 'player2', currentTeam: false, state: {room_id: 41}};
            this.assert.strictEqual(
                await CreatePlayerTeamHandler.joinExistentTeam({send: () => true}, memberNextScene, teamsPlugin),
                false
            );
            this.assert.strictEqual(memberNextScene.currentTeam, false);
            this.assert.deepStrictEqual(Object.keys(team.players), ['1']);
        });
    }

    async testRecordOfADeletedTeamIsConsumed()
    {
        await this.test('the changing room record of a deleted team leaves the player with no team box', async () => {
            let sentMessages = [];
            let teamsPlugin = {teams: {}, teamChangingRoomPlayers: {2: {teamId: 1, leavingPlayerSessionId: 's2'}}};
            let member = {player_id: 2, playerName: 'player2', currentTeam: 1, state: {room_id: 114}};
            let client = {send: (type, message) => sentMessages.push(message)};
            this.assert.strictEqual(await CreatePlayerTeamHandler.joinExistentTeam(client, member, teamsPlugin), false);
            this.assert.strictEqual(member.currentTeam, false);
            this.assert.deepStrictEqual(teamsPlugin.teamChangingRoomPlayers, {});
            this.assert.deepStrictEqual(
                sentMessages,
                [{act: TeamsConst.ACTIONS.TEAM_LEFT, id: 1, listener: TeamsConst.KEY}]
            );
        });
    }

    async testDisbandLineReachesTheMemberInAnotherScene()
    {
        await this.test('the owner disband line reaches a member in another scene through its team client', async () => {
            let savedMessages = [];
            let memberMessages = [];
            let teamPlayers = this.createTeamWithMember(memberMessages);
            let chatMessageActions = new ChatMessageActions({
                events: {},
                chatPlugin: {chatManager: {saveMessage: async (...saved) => savedMessages.push(saved)}}
            });
            this.assert.strictEqual(await chatMessageActions.ownerDisbandTeam(teamPlayers.member, teamPlayers.team), true);
            let disbandedLine = TeamsConst.CHAT.MESSAGE.DISBANDED.replace('%playerName', teamPlayers.owner.playerName)
                .replace('%groupName', 'team');
            this.assert.deepStrictEqual(
                memberMessages.map(message => [message[ChatConst.MESSAGE.KEY], message[ChatConst.TYPES.KEY]]),
                [[disbandedLine, ChatConst.TYPES.TEAMS]]
            );
            this.assert.deepStrictEqual(savedMessages, [[disbandedLine, 2, 114, false, ChatConst.TYPES.TEAMS]]);
        });
    }

    async testALeaveOfAPlayerOutOfTheTeamSendsNothing()
    {
        await this.test('a team leave of a player that is not in the team sends no line and a member leave sends it', async () => {
            let listeners = {};
            let memberMessages = [];
            let teamPlayers = this.createTeamWithMember(memberMessages);
            let chatMessageActions = new ChatMessageActions({
                events: {on: (eventName, callback) => listeners[eventName] = callback},
                chatPlugin: {chatManager: {saveMessage: async () => true}}
            });
            chatMessageActions.teamMemberLeaveEventListener();
            let leaveListener = listeners['reldens.teamLeaveBeforeSendUpdate'];
            let leaveProps = {currentTeam: teamPlayers.team, room: {}, isOwnerDisbanding: true};
            let outOfTeamResult = await leaveListener(Object.assign({playerId: 99}, leaveProps));
            let outOfTeamMessages = memberMessages.length;
            this.assert.deepStrictEqual(
                [outOfTeamResult, outOfTeamMessages, await leaveListener(Object.assign({playerId: 2}, leaveProps)), memberMessages.length],
                [false, 0, true, 1]
            );
        });
    }

}

module.exports.TestTeamSceneChange = TestTeamSceneChange;
