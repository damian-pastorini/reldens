/**
 *
 * Reldens - Test Team And Clan Invites
 *
 */

const { BaseTest } = require('./base-test');
const { ClanFixturesBuilder } = require('./fixtures/clan-fixtures-builder');
const { TeamMessageActions } = require('../lib/teams/server/team-message-actions');
const { ClanMessageActions } = require('../lib/teams/server/clan-message-actions');
const { ClanJoin } = require('../lib/teams/server/message-actions/clan-join');
const { Clan } = require('../lib/teams/server/clan');
const { TeamsConst } = require('../lib/teams/constants');

class TestTeamAndClanInvites extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.inviterId = '3';
        this.otherPlayerId = '8';
        this.clanId = 20;
        this.teamAccept = {act: TeamsConst.ACTIONS.TEAM_ACCEPTED, value: '1', id: this.inviterId};
        this.teamDecline = {act: TeamsConst.ACTIONS.TEAM_ACCEPTED, value: '2', id: this.inviterId};
        this.clanAccept = {act: TeamsConst.ACTIONS.CLAN_ACCEPTED, value: '1', id: this.clanId};
        this.clanDecline = {act: TeamsConst.ACTIONS.CLAN_ACCEPTED, value: '2', id: this.clanId};
    }

    createTeamsPlugin(pluginData, setup)
    {
        return ClanFixturesBuilder.createTeamsPlugin(Object.assign({
            events: {emit: async (eventName) => setup.emittedEvents.push(eventName)},
            dataServer: ClanFixturesBuilder.createClanJoinDataServer(setup.recordedCalls),
            teamPendingInvites: {}
        }, pluginData));
    }

    createSetup()
    {
        let setup = {emittedEvents: [], recordedCalls: [], sentMessages: []};
        setup.client = {send: (messageKey, message) => setup.sentMessages.push(message)};
        setup.invitedPlayer = ClanFixturesBuilder.createOwnerSchema();
        setup.invitedPlayer.privateData = {};
        return setup;
    }

    createTeamRoom(setup, isInviterActive)
    {
        return {
            roomId: 'room-1',
            activePlayerByPlayerId: () => isInviterActive ? {client: setup.client, playerId: this.inviterId} : false,
            playerByPlayerIdFromState: () => false
        };
    }

    createInvitingClan(setup, pendingInvites)
    {
        return new Clan({
            id: this.clanId,
            owner: {player_id: this.inviterId, playerName: 'ImRoot3'},
            players: {[this.inviterId]: {state: {room_id: 1}}},
            clients: {[this.inviterId]: setup.client},
            pendingInvites
        });
    }

    async sendClanMessage(setup, teamsPlugin, message)
    {
        return await new ClanMessageActions({teamsPlugin}).executeMessageActions(
            setup.client,
            message,
            {},
            setup.invitedPlayer
        );
    }

    async testDeclinedTeamInviteCanNotBeAcceptedLater()
    {
        await this.test('a declined team invite is consumed and accepting it later is rejected', async () => {
            let setup = this.createSetup();
            let pendingInvites = {[this.inviterId]: {[setup.invitedPlayer.player_id]: true}};
            let teamsPlugin = this.createTeamsPlugin({teamPendingInvites: pendingInvites}, setup);
            let room = this.createTeamRoom(setup, true);
            let messageActions = new TeamMessageActions({teamsPlugin});
            await messageActions.executeMessageActions(setup.client, this.teamDecline, room, setup.invitedPlayer);
            this.assert.deepStrictEqual(teamsPlugin.teamPendingInvites, {[this.inviterId]: {}});
            this.assert.deepStrictEqual(setup.emittedEvents, ['reldens.teamJoinInviteRejected']);
            let joinResult = await messageActions.executeMessageActions(
                setup.client,
                this.teamAccept,
                room,
                setup.invitedPlayer
            );
            this.assert.strictEqual(joinResult, false);
            this.assert.deepStrictEqual(teamsPlugin.teams, {});
            this.assert.strictEqual(Boolean(setup.invitedPlayer.currentTeam), false);
        });
    }

    async testTeamInviteDeclinedAfterTheInviterLeftIsConsumed()
    {
        await this.test('a team invite declined after the inviter left is consumed without the rejected event', async () => {
            let setup = this.createSetup();
            let pendingInvites = {[this.inviterId]: {[setup.invitedPlayer.player_id]: true}};
            let teamsPlugin = this.createTeamsPlugin({teamPendingInvites: pendingInvites}, setup);
            await new TeamMessageActions({teamsPlugin}).executeMessageActions(
                setup.client,
                this.teamDecline,
                this.createTeamRoom(setup, false),
                setup.invitedPlayer
            );
            this.assert.deepStrictEqual(teamsPlugin.teamPendingInvites, {[this.inviterId]: {}});
            this.assert.deepStrictEqual(setup.emittedEvents, []);
        });
    }

    async testTeamDeclineWithoutInviteIsRejected()
    {
        await this.test('a team decline without a pending invite is rejected and never notifies the inviter', async () => {
            let setup = this.createSetup();
            let otherInvites = {[this.inviterId]: {[this.otherPlayerId]: true}};
            let teamsPlugin = this.createTeamsPlugin({teamPendingInvites: otherInvites}, setup);
            let declineResult = await new TeamMessageActions({teamsPlugin}).executeMessageActions(
                setup.client,
                this.teamDecline,
                this.createTeamRoom(setup, true),
                setup.invitedPlayer
            );
            this.assert.strictEqual(declineResult, false);
            this.assert.deepStrictEqual(teamsPlugin.teamPendingInvites, {[this.inviterId]: {[this.otherPlayerId]: true}});
            this.assert.deepStrictEqual(setup.emittedEvents, []);
        });
    }

    async testDeclinedClanInviteCanNotBeAcceptedLater()
    {
        await this.test('a declined clan invite is consumed and accepting it later is rejected', async () => {
            let setup = this.createSetup();
            let invitingClan = this.createInvitingClan(setup, {[setup.invitedPlayer.player_id]: true});
            let teamsPlugin = this.createTeamsPlugin({clans: {[this.clanId]: invitingClan}}, setup);
            this.assert.strictEqual(await this.sendClanMessage(setup, teamsPlugin, this.clanDecline), true);
            this.assert.deepStrictEqual(invitingClan.pendingInvites, {});
            this.assert.deepStrictEqual(setup.emittedEvents, ['reldens.clanJoinInviteRejected']);
            this.assert.strictEqual(await this.sendClanMessage(setup, teamsPlugin, this.clanAccept), false);
            this.assert.deepStrictEqual(setup.recordedCalls, []);
            this.assert.deepStrictEqual(invitingClan.members, {});
            this.assert.strictEqual(Boolean(setup.invitedPlayer.privateData.clan), false);
        });
    }

    async testClanDeclineWithoutInviteIsRejected()
    {
        await this.test('a clan decline without a pending invite is rejected and never notifies the owner', async () => {
            let setup = this.createSetup();
            let invitingClan = this.createInvitingClan(setup, {[this.otherPlayerId]: true});
            let teamsPlugin = this.createTeamsPlugin({clans: {[this.clanId]: invitingClan}}, setup);
            this.assert.strictEqual(await this.sendClanMessage(setup, teamsPlugin, this.clanDecline), false);
            this.assert.deepStrictEqual(invitingClan.pendingInvites, {[this.otherPlayerId]: true});
            this.assert.deepStrictEqual(setup.emittedEvents, []);
        });
    }

    async testClanDeclineOfAnUnknownClanIsRejected()
    {
        await this.test('a clan decline of a clan that does not exist is rejected', async () => {
            let setup = this.createSetup();
            let teamsPlugin = this.createTeamsPlugin({clans: {}}, setup);
            this.assert.strictEqual(await this.sendClanMessage(setup, teamsPlugin, this.clanDecline), false);
            this.assert.deepStrictEqual(setup.emittedEvents, []);
        });
    }

    async testClanInviteIsConsumedByTheJoin()
    {
        await this.test('a clan invite is consumed by the join so a second accept never adds the member again', async () => {
            let setup = this.createSetup();
            let invitingClan = this.createInvitingClan(setup, {[setup.invitedPlayer.player_id]: true});
            let teamsPlugin = this.createTeamsPlugin({clans: {[this.clanId]: invitingClan}}, setup);
            await ClanJoin.execute(setup.client, {id: this.clanId}, {}, setup.invitedPlayer, teamsPlugin);
            this.assert.deepStrictEqual(invitingClan.pendingInvites, {});
            this.assert.strictEqual(setup.invitedPlayer.privateData.clan, this.clanId);
            let secondJoinResult = await ClanJoin.execute(
                setup.client,
                {id: this.clanId},
                {},
                setup.invitedPlayer,
                teamsPlugin
            );
            this.assert.strictEqual(secondJoinResult, false);
            this.assert.deepStrictEqual(setup.recordedCalls, [
                {entityKey: 'clanMembers', created: {player_id: setup.invitedPlayer.player_id, clan_id: this.clanId}}
            ]);
        });
    }

    async testOverlappingClanJoinsAddTheMemberOnce()
    {
        await this.test('two overlapping accepts of one clan invite add the member once', async () => {
            let setup = this.createSetup();
            let invitingClan = this.createInvitingClan(setup, {[setup.invitedPlayer.player_id]: true});
            let teamsPlugin = this.createTeamsPlugin({clans: {[this.clanId]: invitingClan}}, setup);
            let joinResults = await Promise.all([
                this.sendClanMessage(setup, teamsPlugin, this.clanAccept),
                this.sendClanMessage(setup, teamsPlugin, this.clanAccept)
            ]);
            this.assert.strictEqual([...joinResults].pop(), false);
            this.assert.deepStrictEqual(setup.recordedCalls, [
                {entityKey: 'clanMembers', created: {player_id: setup.invitedPlayer.player_id, clan_id: this.clanId}}
            ]);
            this.assert.deepStrictEqual(invitingClan.pendingInvites, {});
        });
    }

}

module.exports.TestTeamAndClanInvites = TestTeamAndClanInvites;
